package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.AiAssistantConfig;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.dto.AssistantChatRequest;
import com.excel.forum.entity.dto.AssistantChatResponse;
import com.excel.forum.service.AiAssistantCallLogService;
import com.excel.forum.service.AiAssistantConfigService;
import com.excel.forum.service.AssistantService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.TutorialArticleService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantServiceImpl implements AssistantService {
    private static final String SYSTEM_PROMPT = String.join("\n",
            "你是一个专业、可靠、克制的 Excel 中文助手。",
            "输出必须使用自然中文纯文本。",
            "不要使用 Markdown 排版标记，包括 #、##、---、```、**、反引号。",
            "标题直接写成“结论：”“步骤：”“公式：”，列表使用 1. 2. 3. 这样的编号。",
            "Excel 公式本身必须完整保留，例如 =SUM(A1:A10)。"
    );
    private static final Pattern EXCEL_FUNCTION_PATTERN = Pattern.compile("(?i)\\b([A-Z][A-Z0-9_]{1,24})\\s*(?:\\(|$)");
    private static final Pattern CJK_TOKEN_PATTERN = Pattern.compile("[\\p{IsHan}]{2,12}");
    private static final Pattern LATIN_TOKEN_PATTERN = Pattern.compile("[A-Za-z][A-Za-z0-9_-]{1,24}");
    private static final Pattern MARKDOWN_FENCE_LINE_PATTERN = Pattern.compile("(?m)^\\s*```[\\w-]*\\s*$");
    private static final Pattern MARKDOWN_RULE_LINE_PATTERN = Pattern.compile("(?m)^\\s*[-*_]{3,}\\s*$");
    private static final Pattern MARKDOWN_HEADING_LINE_PATTERN = Pattern.compile("(?m)^\\s{0,3}#{1,6}\\s+(.+)$");
    private static final Pattern MARKDOWN_BOLD_PATTERN = Pattern.compile("\\*\\*([^\\n*][^\\n]*?)\\*\\*");
    private static final Pattern MARKDOWN_INLINE_CODE_PATTERN = Pattern.compile("`([^`\\n]+)`");

    private final TutorialArticleService tutorialArticleService;
    private final QuestionService questionService;
    private final AiAssistantConfigService aiAssistantConfigService;
    private final AiAssistantCallLogService aiAssistantCallLogService;
    private final Environment environment;
    private final ObjectMapper objectMapper;

    @Override
    public AssistantChatResponse chat(Long userId, AssistantChatRequest request) {
        if (request == null || isBlank(request.getMessage())) {
            throw new IllegalArgumentException("请输入你想咨询的 Excel 问题");
        }
        AssistantRuntimeConfig runtimeConfig = resolveRuntimeConfig();

        String conversationId = isBlank(request.getConversationId()) ? UUID.randomUUID().toString() : request.getConversationId().trim();
        String message = clamp(request.getMessage(), maxInputChars());
        String formula = clamp(request.getFormula(), 1200);
        String workbookContext = clamp(request.getWorkbookContext(), Math.max(0, maxInputChars() - message.length()));

        List<String> keywords = buildKeywords(message, formula, workbookContext);
        List<Map<String, Object>> relatedTutorials = findRelatedTutorials(keywords, request.getTutorialArticleId());
        List<Map<String, Object>> relatedQuestions = findRelatedQuestions(keywords, request.getPracticeQuestionId());

        String prompt = buildPrompt(message, formula, workbookContext, relatedTutorials, relatedQuestions);
        long startedAt = System.currentTimeMillis();
        LlmResult result;
        try {
            result = askModel(runtimeConfig, prompt);
            recordAssistantCall(userId, runtimeConfig.configId(), result.model(), true, result.fallbackUsed(), System.currentTimeMillis() - startedAt, null);
        } catch (RuntimeException e) {
            recordAssistantCall(userId, runtimeConfig.configId(), runtimeConfig.model(), false, false, System.currentTimeMillis() - startedAt, e.getMessage());
            throw e;
        }

        return new AssistantChatResponse(
                conversationId,
                result.answer(),
                relatedTutorials,
                relatedQuestions,
                result.model(),
                result.fallbackUsed()
        );
    }

    private int maxInputChars() {
        return Math.max(1000, environment.getProperty("AI_ASSISTANT_MAX_INPUT_CHARS", Integer.class, 6000));
    }

    private int maxOutputTokens() {
        return Math.max(256, environment.getProperty("AI_ASSISTANT_MAX_OUTPUT_TOKENS", Integer.class, 1200));
    }

    private int timeoutMs() {
        return Math.max(3000, environment.getProperty("AI_ASSISTANT_TIMEOUT_MS", Integer.class, 20000));
    }

    private String buildPrompt(String message, String formula, String workbookContext,
                               List<Map<String, Object>> tutorials,
                               List<Map<String, Object>> questions) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是 ExcelCC.cn 的 Excel AI 助手。\n");
        sb.append("目标：用简洁、准确、实操导向的中文回答用户 Excel 问题。\n");
        sb.append("要求：\n");
        sb.append("1. 优先给出能直接用的公式、排错步骤和原因解释。\n");
        sb.append("2. 如果用户给了公式，先解释公式结构，再指出错误或改写建议。\n");
        sb.append("3. 如果信息不足，明确说缺什么，不要瞎编。\n");
        sb.append("4. 不要编造 ExcelCC 的站内内容，只能引用提供给你的教程/题目线索。\n");
        sb.append("5. 默认使用中文，必要时保留英文函数名。\n\n");
        sb.append("6. 输出必须是纯文本，不要使用 Markdown 符号或代码围栏。\n");
        sb.append("7. 不要输出 #、##、---、```、**、反引号等排版符号；函数名和公式不需要用反引号包裹。\n\n");
        sb.append("用户问题：\n").append(message).append("\n\n");
        if (!isBlank(formula)) sb.append("用户公式：\n").append(formula).append("\n\n");
        if (!isBlank(workbookContext)) sb.append("用户提供的表格/上下文：\n").append(workbookContext).append("\n\n");
        if (!tutorials.isEmpty()) {
            sb.append("可参考的站内教程：\n");
            for (Map<String, Object> item : tutorials) {
                sb.append("- [教程]").append(defaultString(item.get("title")))
                        .append(" | 摘要: ").append(defaultString(item.get("summary")))
                        .append(" | 链接: ").append(defaultString(item.get("path"))).append("\n");
            }
            sb.append("\n");
        }
        if (!questions.isEmpty()) {
            sb.append("可参考的站内练习：\n");
            for (Map<String, Object> item : questions) {
                sb.append("- [练习]").append(defaultString(item.get("title")))
                        .append(" | 说明: ").append(defaultString(item.get("explanation")))
                        .append(" | 链接: ").append(defaultString(item.get("path"))).append("\n");
            }
            sb.append("\n");
        }
        sb.append("输出格式硬性要求：\n");
        sb.append("结论：先用一句话回答。\n");
        sb.append("步骤：使用 1. 2. 3. 编号说明。\n");
        sb.append("公式：如果适用，最后给一个可直接复制的公式；不要包裹 Markdown 符号。\n");
        return sb.toString();
    }

    private AssistantRuntimeConfig resolveRuntimeConfig() {
        AiAssistantConfig activeConfig = aiAssistantConfigService.getActiveConfig();
        if (activeConfig != null) {
            String baseUrl = trimToNull(activeConfig.getBaseUrl());
            String apiKey = trimToNull(activeConfig.getApiKey());
            String model = trimToNull(activeConfig.getModel());
            if (baseUrl == null || apiKey == null || model == null) {
                throw new IllegalStateException("AI 助手配置不完整");
            }
            return new AssistantRuntimeConfig(
                    activeConfig.getId(),
                    normalizeBaseUrl(baseUrl),
                    apiKey,
                    model,
                    null,
                    null,
                    null,
                    trimToNull(activeConfig.getSystemPrompt()) == null ? SYSTEM_PROMPT : activeConfig.getSystemPrompt().trim()
            );
        }

        if (!environment.getProperty("AI_ASSISTANT_ENABLED", Boolean.class, false)) {
            throw new IllegalStateException("AI 助手暂未开启");
        }
        String primaryBaseUrl = trimToNull(environment.getProperty("AI_ASSISTANT_BASE_URL"));
        String primaryApiKey = trimToNull(environment.getProperty("AI_ASSISTANT_API_KEY"));
        String primaryModel = trimToNull(environment.getProperty("AI_ASSISTANT_MODEL"));
        String fallbackBaseUrl = trimToNull(environment.getProperty("AI_ASSISTANT_FALLBACK_BASE_URL", primaryBaseUrl));
        String fallbackApiKey = trimToNull(environment.getProperty("AI_ASSISTANT_FALLBACK_API_KEY", primaryApiKey));
        String fallbackModel = trimToNull(environment.getProperty("AI_ASSISTANT_FALLBACK_MODEL"));
        if (primaryBaseUrl == null || primaryApiKey == null || primaryModel == null) {
            throw new IllegalStateException("AI 助手配置不完整");
        }
        return new AssistantRuntimeConfig(
                null,
                normalizeBaseUrl(primaryBaseUrl),
                primaryApiKey,
                primaryModel,
                fallbackBaseUrl == null ? null : normalizeBaseUrl(fallbackBaseUrl),
                fallbackApiKey,
                fallbackModel,
                SYSTEM_PROMPT
        );
    }

    private LlmResult askModel(AssistantRuntimeConfig config, String prompt) {
        try {
            return new LlmResult(callOpenAiCompatible(config.baseUrl(), config.apiKey(), config.model(), config.systemPrompt(), prompt), config.model(), false);
        } catch (Exception e) {
            log.warn("assistant primary model failed: {}", e.toString());
        }
        if (config.fallbackBaseUrl() != null && config.fallbackApiKey() != null && config.fallbackModel() != null) {
            try {
                return new LlmResult(callOpenAiCompatible(config.fallbackBaseUrl(), config.fallbackApiKey(), config.fallbackModel(), config.systemPrompt(), prompt), config.fallbackModel(), true);
            } catch (Exception e) {
                log.error("assistant fallback model failed: {}", e.toString());
            }
        }
        throw new IllegalStateException("AI 助手暂时不可用，请稍后再试");
    }

    private String callOpenAiCompatible(String baseUrl, String apiKey, String model, String systemPrompt, String prompt) throws IOException, InterruptedException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("temperature", 0.3);
        payload.put("max_tokens", maxOutputTokens());
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", prompt)
        ));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(normalizeBaseUrl(baseUrl) + "/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMillis(timeoutMs()))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(timeoutMs())).build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) throw new IOException("upstream " + response.statusCode() + ": " + response.body());
        JsonNode root = objectMapper.readTree(response.body());
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) throw new IOException("empty choices from upstream");
        String answer = normalizeAnswer(choices.get(0).path("message").path("content").asText(""));
        if (answer.isEmpty()) throw new IOException("empty answer from upstream");
        return answer;
    }

    private String normalizeAnswer(String answer) {
        if (answer == null) return "";
        String normalized = answer.replace("\r\n", "\n").replace("\r", "\n");
        normalized = MARKDOWN_FENCE_LINE_PATTERN.matcher(normalized).replaceAll("");
        normalized = MARKDOWN_RULE_LINE_PATTERN.matcher(normalized).replaceAll("");
        normalized = MARKDOWN_HEADING_LINE_PATTERN.matcher(normalized).replaceAll("$1");
        normalized = MARKDOWN_BOLD_PATTERN.matcher(normalized).replaceAll("$1");
        normalized = MARKDOWN_INLINE_CODE_PATTERN.matcher(normalized).replaceAll("$1");
        normalized = normalized.replaceAll("(?m)^\\s*>\\s?", "");
        normalized = normalized.replaceAll("\\n{3,}", "\n\n");
        return normalized.trim();
    }

    private List<Map<String, Object>> findRelatedTutorials(List<String> keywords, Long forcedId) {
        List<TutorialArticle> articles = tutorialArticleService.list(new QueryWrapper<TutorialArticle>().eq("enabled", true).orderByAsc("sort_order").orderByAsc("id"));
        List<ScoredTutorial> scored = new ArrayList<>();
        for (TutorialArticle article : articles) {
            int score = forcedId != null && Objects.equals(forcedId, article.getId()) ? 1000 : scoreText(List.of(defaultString(article.getTitle()), defaultString(article.getSummary()), defaultString(article.getOneLineUsage()), defaultString(article.getFunctionTags()), defaultString(article.getContent())), keywords);
            if (score > 0) scored.add(new ScoredTutorial(article, score));
        }
        return scored.stream().sorted(Comparator.comparingInt(ScoredTutorial::score).reversed().thenComparing(item -> item.article().getId())).limit(5).map(item -> {
            TutorialArticle article = item.article();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", article.getId());
            result.put("title", article.getTitle());
            result.put("summary", defaultString(article.getSummary()));
            result.put("path", "/tutorials?article=" + article.getId());
            return result;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> findRelatedQuestions(List<String> keywords, Long forcedId) {
        List<Question> questions = questionService.list(new QueryWrapper<Question>().eq("enabled", true).eq("type", "excel_template").orderByDesc("create_time"));
        List<ScoredQuestion> scored = new ArrayList<>();
        for (Question question : questions) {
            int score = forcedId != null && Objects.equals(forcedId, question.getId()) ? 1000 : scoreText(List.of(defaultString(question.getTitle()), defaultString(question.getExplanation()), defaultString(question.getAnswer())), keywords);
            if (score > 0) scored.add(new ScoredQuestion(question, score));
        }
        return scored.stream().sorted(Comparator.comparingInt(ScoredQuestion::score).reversed().thenComparing(item -> item.question().getId())).limit(5).map(item -> {
            Question question = item.question();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", question.getId());
            result.put("title", question.getTitle());
            result.put("explanation", defaultString(question.getExplanation()));
            result.put("path", "/practice/question/" + question.getId());
            return result;
        }).collect(Collectors.toList());
    }

    private int scoreText(List<String> haystacks, List<String> keywords) {
        int score = 0;
        for (String keyword : keywords) {
            String keywordLower = keyword.toLowerCase(Locale.ROOT);
            for (String haystack : haystacks) {
                if (haystack == null || haystack.isBlank()) continue;
                String text = haystack.toLowerCase(Locale.ROOT);
                if (text.contains(keywordLower)) score += keyword.length() >= 5 ? 4 : 2;
            }
        }
        return score;
    }

    private List<String> buildKeywords(String... texts) {
        Set<String> keywords = new LinkedHashSet<>();
        for (String text : texts) {
            if (isBlank(text)) continue;
            Matcher functionMatcher = EXCEL_FUNCTION_PATTERN.matcher(text);
            while (functionMatcher.find()) { String fn = functionMatcher.group(1); if (fn != null && fn.length() >= 2) keywords.add(fn.toUpperCase(Locale.ROOT)); }
            Matcher cjkMatcher = CJK_TOKEN_PATTERN.matcher(text);
            while (cjkMatcher.find()) keywords.add(cjkMatcher.group());
            Matcher latinMatcher = LATIN_TOKEN_PATTERN.matcher(text);
            while (latinMatcher.find()) { String token = latinMatcher.group(); if (token.length() >= 3) keywords.add(token.toUpperCase(Locale.ROOT)); }
        }
        return keywords.stream().limit(20).collect(Collectors.toList());
    }

    private String clamp(String value, int max) { if (value == null) return ""; String trimmed = value.trim(); return trimmed.length() <= max ? trimmed : trimmed.substring(0, max); }
    private boolean isBlank(String value) { return value == null || value.trim().isEmpty(); }
    private String trimToNull(String value) { return isBlank(value) ? null : value.trim(); }
    private String defaultString(Object value) { return value == null ? "" : String.valueOf(value); }
    private void recordAssistantCall(Long userId, Long configId, String model, boolean success, boolean fallbackUsed, long latencyMs, String errorMessage) {
        try {
            aiAssistantCallLogService.record(userId, configId, model, success, fallbackUsed, latencyMs, errorMessage);
        } catch (Exception e) {
            log.warn("assistant call stat record failed: {}", e.toString());
        }
    }
    private String normalizeBaseUrl(String value) {
        String normalized = value.replaceAll("/+$", "");
        if (normalized.endsWith("/chat/completions")) {
            normalized = normalized.substring(0, normalized.length() - "/chat/completions".length());
        }
        return normalized;
    }
    private record AssistantRuntimeConfig(Long configId, String baseUrl, String apiKey, String model, String fallbackBaseUrl, String fallbackApiKey, String fallbackModel, String systemPrompt) {}
    private record LlmResult(String answer, String model, boolean fallbackUsed) {}
    private record ScoredTutorial(TutorialArticle article, int score) {}
    private record ScoredQuestion(Question question, int score) {}
}
