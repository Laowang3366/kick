package cn.local.quicktranslate;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

final class MobileFloatingTranslateOverlay {
    private static final String[] TARGET_LANGUAGE_CODES = {
        "zh-CN", "zh-TW", "en-US", "ja-JP", "ko-KR", "fr-FR", "de-DE", "es-ES",
        "ru-RU", "pt-BR", "it-IT", "ar-SA", "hi-IN", "vi-VN", "th-TH", "tr-TR", "id-ID"
    };
    private static final String[] TARGET_LANGUAGE_LABELS = {
        "简体中文", "繁体中文", "英语", "日语", "韩语", "法语", "德语", "西班牙语",
        "俄语", "葡萄牙语", "意大利语", "阿拉伯语", "印地语", "越南语", "泰语", "土耳其语", "印尼语"
    };
    private static final String[] TRANSLATE_URLS = {
        MobileFloatingTranslateSettings.BACKEND_TRANSLATE_URL,
        MobileFloatingTranslateSettings.BACKEND_TRANSLATE_FALLBACK_URL
    };

    private static MobileFloatingTranslateOverlay sharedOverlay;

    private final Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View floatingView;
    private EditText sourceInput;
    private TextView resultView;
    private TextView statusView;
    private Button copyButton;
    private Runnable pendingAutoTranslate;
    private String latestTranslatedText = "";
    private String currentTargetLanguage = MobileFloatingTranslateSettings.DEFAULT_TARGET_LANGUAGE;
    private long translationGeneration = 0;
    private boolean lastAnchorOnRight = true;

    private MobileFloatingTranslateOverlay(Context context) {
        this.context = context.getApplicationContext();
    }

    static synchronized MobileFloatingTranslateOverlay get(Context context) {
        if (sharedOverlay == null) {
            sharedOverlay = new MobileFloatingTranslateOverlay(context);
        }
        return sharedOverlay;
    }

    void showFromClipboard(String triggerSource) {
        showFromClipboardOrManual(triggerSource);
    }

    void showFromClipboardOrManual(String triggerSource) {
        showFromClipboardOrManual(triggerSource, context.getResources().getDisplayMetrics().widthPixels, dp(180));
    }

    void showFromClipboardOrManual(String triggerSource, int anchorX, int anchorY) {
        if (!MobileFloatingTranslateSettings.canDrawOverlays(context)) {
            Toast.makeText(context, "请先开启快捷翻译悬浮窗权限", Toast.LENGTH_SHORT).show();
            return;
        }

        showPanel("", MobileFloatingTranslateSettings.getTargetLanguage(context), true, anchorX, anchorY);
    }

    void showFloatingTranslate(String text, String targetLanguage, String translationFormat, String triggerSource) {
        showPanel(
            MobileFloatingTranslateSettings.limitText(text),
            normalizeTargetLanguage(targetLanguage),
            false,
            context.getResources().getDisplayMetrics().widthPixels,
            dp(180)
        );
    }

    void hide() {
        mainHandler.post(this::removeFloatingView);
    }

    private void showPanel(String initialText, String targetLanguage, boolean shouldReadClipboard, int anchorX, int anchorY) {
        mainHandler.post(() -> {
            removeFloatingView();
            latestTranslatedText = "";
            currentTargetLanguage = normalizeTargetLanguage(targetLanguage);
            lastAnchorOnRight = anchorX >= context.getResources().getDisplayMetrics().widthPixels / 2;
            windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
            if (windowManager == null) {
                Toast.makeText(context, "无法创建悬浮翻译窗", Toast.LENGTH_SHORT).show();
                return;
            }

            floatingView = createPanelView(initialText);
            WindowManager.LayoutParams params = createPanelLayoutParams(anchorX, anchorY);
            try {
                windowManager.addView(floatingView, params);
                animatePanelIn(floatingView, lastAnchorOnRight);
                floatingView.requestFocus();
                if (initialText.trim().isEmpty()) {
                    setStatus(shouldReadClipboard ? "正在读取剪切板..." : "请输入或粘贴原文", false);
                } else {
                    startTranslation(initialText);
                }
                if (shouldReadClipboard) {
                    mainHandler.postDelayed(this::readClipboardIntoPanel, 280);
                } else if (initialText.trim().isEmpty()) {
                    focusSourceInput(true);
                }
            } catch (RuntimeException error) {
                floatingView = null;
                Toast.makeText(context, "悬浮窗打开失败：" + error.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private View createPanelView(String initialText) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setFocusable(true);
        card.setFocusableInTouchMode(true);
        card.setPadding(dp(14), dp(10), dp(14), dp(12));
        card.setBackground(createPanelBackground());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            card.setElevation(dp(14));
        }
        attachPanelDragHandler(card);

        LinearLayout header = new LinearLayout(context);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        attachPanelDragHandler(header);

        TextView title = new TextView(context);
        title.setText("快捷翻译");
        title.setTextColor(Color.rgb(13, 86, 184));
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextSize(14);
        title.setGravity(Gravity.CENTER_VERTICAL);
        attachPanelDragHandler(title);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(36), 1));

        Spinner targetSpinner = createTargetSpinner();
        header.addView(targetSpinner, new LinearLayout.LayoutParams(dp(118), dp(36)));

        copyButton = createHeaderButton("复制译文");
        copyButton.setEnabled(false);
        copyButton.setOnClickListener((view) -> copyLatestResult());
        header.addView(copyButton);

        Button closeButton = createHeaderButton("×");
        closeButton.setTextSize(20);
        closeButton.setOnClickListener((view) -> collapsePanel(lastAnchorOnRight));
        header.addView(closeButton, new LinearLayout.LayoutParams(dp(40), dp(36)));

        card.addView(header);

        sourceInput = new EditText(context);
        sourceInput.setText(initialText);
        sourceInput.setHint("输入或粘贴原文");
        sourceInput.setTextColor(Color.rgb(24, 32, 45));
        sourceInput.setHintTextColor(Color.rgb(130, 142, 162));
        sourceInput.setTextSize(15);
        sourceInput.setMinLines(2);
        sourceInput.setMaxLines(5);
        sourceInput.setGravity(Gravity.TOP | Gravity.START);
        sourceInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        sourceInput.setBackground(createFieldBackground());
        sourceInput.setPadding(dp(12), dp(8), dp(12), dp(8));
        sourceInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence text, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence text, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable editable) {
                scheduleAutoTranslate(editable == null ? "" : editable.toString());
            }
        });
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        inputParams.topMargin = dp(8);
        card.addView(sourceInput, inputParams);

        statusView = new TextView(context);
        statusView.setTextColor(Color.rgb(13, 86, 184));
        statusView.setTextSize(13);
        statusView.setTypeface(Typeface.DEFAULT_BOLD);
        statusView.setPadding(dp(2), dp(8), 0, dp(4));
        attachPanelDragHandler(statusView);
        card.addView(statusView);

        resultView = createBodyTextView("译文会显示在这里", Color.rgb(75, 85, 101));
        LimitedScrollView resultScroll = new LimitedScrollView(context, dp(190));
        resultScroll.addView(resultView);
        resultScroll.setFillViewport(false);
        resultScroll.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        card.addView(resultScroll, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        return card;
    }

    private Spinner createTargetSpinner() {
        Spinner spinner = new Spinner(context, Spinner.MODE_DROPDOWN);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(context, android.R.layout.simple_spinner_item, TARGET_LANGUAGE_LABELS);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setBackground(createFieldBackground());
        spinner.setPadding(dp(6), 0, dp(6), 0);
        spinner.setSelection(indexOfTargetLanguage(currentTargetLanguage));
        spinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            private boolean initialized;

            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String selectedLanguage = TARGET_LANGUAGE_CODES[Math.max(0, Math.min(position, TARGET_LANGUAGE_CODES.length - 1))];
                if (!initialized) {
                    initialized = true;
                    currentTargetLanguage = selectedLanguage;
                    return;
                }
                if (selectedLanguage.equals(currentTargetLanguage)) {
                    return;
                }
                currentTargetLanguage = selectedLanguage;
                MobileFloatingTranslateSettings.saveTargetLanguage(context, currentTargetLanguage);
                String sourceText = getSourceText();
                if (!sourceText.trim().isEmpty()) {
                    startTranslation(sourceText);
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
        return spinner;
    }

    private WindowManager.LayoutParams createPanelLayoutParams(int anchorX, int anchorY) {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int displayWidth = context.getResources().getDisplayMetrics().widthPixels;
        int displayHeight = context.getResources().getDisplayMetrics().heightPixels;
        int width = Math.min(displayWidth - dp(40), dp(420));
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            Math.max(width, dp(300)),
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = clamp(
            lastAnchorOnRight ? displayWidth - width - dp(16) : dp(16),
            dp(8),
            displayWidth - width - dp(8)
        );
        params.y = clamp(anchorY - dp(96), dp(72), Math.max(dp(72), displayHeight - dp(520)));
        return params;
    }

    private void readClipboardIntoPanel() {
        if (sourceInput == null) {
            return;
        }

        String existingText = getSourceText();
        if (!existingText.trim().isEmpty()) {
            return;
        }

        String clipboardText = MobileFloatingTranslateSettings.readClipboardText(context);
        if (clipboardText.trim().isEmpty()) {
            setStatus("剪切板为空，请输入或粘贴原文", true);
            focusSourceInput(true);
            return;
        }

        sourceInput.setText(clipboardText);
        sourceInput.setSelection(sourceInput.getText().length());
        setStatus("已读取剪切板，正在翻译...", false);
        focusSourceInput(false);
    }

    private void scheduleAutoTranslate(String rawText) {
        if (pendingAutoTranslate != null) {
            mainHandler.removeCallbacks(pendingAutoTranslate);
        }

        String text = MobileFloatingTranslateSettings.limitText(rawText);
        if (text.trim().isEmpty()) {
            latestTranslatedText = "";
            translationGeneration += 1;
            if (copyButton != null) {
                copyButton.setEnabled(false);
            }
            setStatus("请输入或粘贴原文", false);
            if (resultView != null) {
                resultView.setText("译文会显示在这里");
                resultView.setTextColor(Color.rgb(75, 85, 101));
            }
            return;
        }

        pendingAutoTranslate = () -> startTranslation(text);
        mainHandler.postDelayed(pendingAutoTranslate, 650);
    }

    private void startTranslation(String rawText) {
        if (pendingAutoTranslate != null) {
            mainHandler.removeCallbacks(pendingAutoTranslate);
            pendingAutoTranslate = null;
        }

        String text = MobileFloatingTranslateSettings.limitText(rawText);
        if (text.trim().isEmpty()) {
            return;
        }

        long generation = ++translationGeneration;
        latestTranslatedText = "";
        if (copyButton != null) {
            copyButton.setEnabled(false);
        }
        setStatus("正在翻译中...", false);
        if (resultView != null) {
            resultView.setText("请稍候");
            resultView.setTextColor(Color.rgb(75, 85, 101));
        }

        executor.execute(() -> {
            try {
                String translatedText = requestTranslationWithFallback(text, currentTargetLanguage, MobileFloatingTranslateSettings.getTranslationFormat(context));
                mainHandler.post(() -> {
                    if (generation == translationGeneration) {
                        showTranslationResult(translatedText);
                    }
                });
            } catch (Exception ex) {
                mainHandler.post(() -> {
                    if (generation == translationGeneration) {
                        showTranslationError(formatTranslationError(ex));
                    }
                });
            }
        });
    }

    private String requestTranslationWithFallback(String text, String targetLanguage, String translationFormat) throws Exception {
        Exception lastError = null;
        for (String endpoint : TRANSLATE_URLS) {
            try {
                return requestTranslation(endpoint, text, targetLanguage, translationFormat);
            } catch (Exception error) {
                lastError = error;
            }
        }

        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("翻译失败");
    }

    private String requestTranslation(String endpoint, String text, String targetLanguage, String translationFormat) throws Exception {
        JSONObject request = new JSONObject();
        request.put("text", text);
        request.put("targetLanguage", targetLanguage);
        request.put("translationFormat", translationFormat);

        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(45000);
        connection.setDoOutput(true);
        connection.setRequestProperty("content-type", "application/json; charset=utf-8");

        byte[] body = request.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body);
        }

        int statusCode = connection.getResponseCode();
        String payload = readResponseBody(statusCode >= 200 && statusCode < 300 ? connection.getInputStream() : connection.getErrorStream());
        connection.disconnect();

        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalStateException("翻译接口返回 " + statusCode);
        }

        String translatedText = new JSONObject(payload).optString("translatedText", "");
        if (translatedText.trim().isEmpty()) {
            throw new IllegalStateException("翻译结果为空");
        }
        return translatedText;
    }

    private void showTranslationResult(String translatedText) {
        latestTranslatedText = translatedText;
        if (copyButton != null) {
            copyButton.setEnabled(true);
        }
        setStatus("翻译完成", false);
        if (resultView != null) {
            resultView.setText(translatedText);
            resultView.setTextColor(Color.rgb(21, 25, 35));
        }
    }

    private void showTranslationError(String message) {
        latestTranslatedText = "";
        if (copyButton != null) {
            copyButton.setEnabled(false);
        }
        setStatus("翻译失败", true);
        if (resultView != null) {
            resultView.setText(message);
            resultView.setTextColor(Color.rgb(180, 35, 24));
        }
    }

    private String formatTranslationError(Exception error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof UnknownHostException) {
                return "手机网络无法解析服务器域名，请检查网络、VPN 或 DNS 设置。";
            }
            current = current.getCause();
        }

        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return "翻译服务暂时不可用，请稍后重试。";
        }
        if (message.contains("Unable to resolve host")) {
            return "手机网络无法解析服务器域名，请检查网络、VPN 或 DNS 设置。";
        }
        return message;
    }

    private void copyLatestResult() {
        if (latestTranslatedText.trim().isEmpty()) {
            Toast.makeText(context, "暂无可复制译文", Toast.LENGTH_SHORT).show();
            return;
        }

        MobileFloatingTranslateSettings.copyToClipboard(context, "快捷翻译译文", latestTranslatedText);
        Toast.makeText(context, "已复制译文", Toast.LENGTH_SHORT).show();
    }

    private void attachPanelDragHandler(View handle) {
        handle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean dragging;

            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (floatingView == null || windowManager == null) {
                    return false;
                }

                WindowManager.LayoutParams params = (WindowManager.LayoutParams) floatingView.getLayoutParams();
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        dragging = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int deltaX = Math.round(event.getRawX() - initialTouchX);
                        int deltaY = Math.round(event.getRawY() - initialTouchY);
                        if (!dragging && Math.abs(deltaX) < dp(7) && Math.abs(deltaY) < dp(7)) {
                            return true;
                        }
                        dragging = true;
                        params.x = initialX + deltaX;
                        params.y = initialY + deltaY;
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (dragging && shouldCollapseAtEdge(params, Math.round(event.getRawX() - initialTouchX))) {
                            collapsePanel(params.x + floatingView.getWidth() / 2 >= context.getResources().getDisplayMetrics().widthPixels / 2);
                        }
                        return dragging;
                    default:
                        return false;
                }
            }
        });
    }

    private boolean shouldCollapseAtEdge(WindowManager.LayoutParams params, int deltaX) {
        if (floatingView == null) {
            return false;
        }

        int displayWidth = context.getResources().getDisplayMetrics().widthPixels;
        int viewWidth = Math.max(floatingView.getWidth(), dp(300));
        boolean nearLeft = params.x <= dp(18) && deltaX < -dp(24);
        boolean nearRight = params.x + viewWidth >= displayWidth - dp(18) && deltaX > dp(24);
        boolean fastLeft = deltaX < -dp(150) && params.x < dp(80);
        boolean fastRight = deltaX > dp(150) && params.x + viewWidth > displayWidth - dp(80);
        return nearLeft || nearRight || fastLeft || fastRight;
    }

    private void collapsePanel(boolean toRight) {
        if (floatingView == null) {
            return;
        }

        View view = floatingView;
        int bubbleY = dp(160);
        if (view.getLayoutParams() instanceof WindowManager.LayoutParams) {
            WindowManager.LayoutParams params = (WindowManager.LayoutParams) view.getLayoutParams();
            bubbleY = params.y + dp(20);
        }
        MobileFloatingBubbleService.moveBubbleToEdge(context, toRight, bubbleY);
        animatePanelOut(view, toRight);
    }

    private void animatePanelIn(View view, boolean fromRight) {
        view.setAlpha(0f);
        view.setScaleX(0.86f);
        view.setScaleY(0.86f);
        view.post(() -> {
            view.setPivotX(fromRight ? view.getWidth() : 0);
            view.setPivotY(dp(48));
            view.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180).start();
        });
    }

    private void animatePanelOut(View view, boolean toRight) {
        view.setPivotX(toRight ? view.getWidth() : 0);
        view.setPivotY(dp(48));
        view.animate()
            .alpha(0f)
            .scaleX(0.82f)
            .scaleY(0.82f)
            .setDuration(150)
            .setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    removeFloatingView();
                }
            })
            .start();
    }

    private void removeFloatingView() {
        if (pendingAutoTranslate != null) {
            mainHandler.removeCallbacks(pendingAutoTranslate);
            pendingAutoTranslate = null;
        }
        translationGeneration += 1;
        if (floatingView != null) {
            floatingView.animate().setListener(null);
        }
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (IllegalArgumentException ignored) {}
        }
        floatingView = null;
        sourceInput = null;
        resultView = null;
        statusView = null;
        copyButton = null;
    }

    private void focusSourceInput(boolean showKeyboard) {
        if (sourceInput == null) {
            return;
        }

        sourceInput.requestFocus();
        if (!showKeyboard) {
            return;
        }

        sourceInput.post(() -> {
            InputMethodManager inputMethodManager = (InputMethodManager) context.getSystemService(Context.INPUT_METHOD_SERVICE);
            if (inputMethodManager != null) {
                inputMethodManager.showSoftInput(sourceInput, InputMethodManager.SHOW_IMPLICIT);
            }
        });
    }

    private String getSourceText() {
        return sourceInput == null || sourceInput.getText() == null ? "" : sourceInput.getText().toString();
    }

    private void setStatus(String message, boolean error) {
        if (statusView == null) {
            return;
        }
        statusView.setText(message);
        statusView.setTextColor(error ? Color.rgb(180, 35, 24) : Color.rgb(13, 86, 184));
    }

    private TextView createBodyTextView(String text, int color) {
        TextView view = new TextView(context);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(15);
        view.setLineSpacing(dp(3), 1.0f);
        view.setPadding(dp(12), dp(10), dp(12), dp(10));
        view.setBackground(createFieldBackground());
        return view;
    }

    private Button createHeaderButton(String label) {
        Button button = new Button(context);
        button.setText(label);
        button.setTextSize(12);
        button.setTextColor(Color.rgb(13, 86, 184));
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setPadding(dp(8), 0, dp(8), 0);
        return button;
    }

    private GradientDrawable createPanelBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(Color.rgb(236, 244, 255));
        drawable.setCornerRadius(dp(18));
        return drawable;
    }

    private GradientDrawable createFieldBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(Color.argb(232, 255, 255, 255));
        drawable.setCornerRadius(dp(12));
        return drawable;
    }

    private int indexOfTargetLanguage(String targetLanguage) {
        String normalizedLanguage = normalizeTargetLanguage(targetLanguage);
        for (int index = 0; index < TARGET_LANGUAGE_CODES.length; index += 1) {
            if (TARGET_LANGUAGE_CODES[index].equals(normalizedLanguage)) {
                return index;
            }
        }
        return 0;
    }

    private String normalizeTargetLanguage(String targetLanguage) {
        if (targetLanguage == null) {
            return MobileFloatingTranslateSettings.DEFAULT_TARGET_LANGUAGE;
        }

        for (String code : TARGET_LANGUAGE_CODES) {
            if (code.equals(targetLanguage)) {
                return targetLanguage;
            }
        }
        return MobileFloatingTranslateSettings.DEFAULT_TARGET_LANGUAGE;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int dp(int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private String readResponseBody(InputStream inputStream) throws Exception {
        if (inputStream == null) {
            return "";
        }

        try (InputStream input = inputStream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private final class LimitedScrollView extends ScrollView {
        private final int maxHeight;

        LimitedScrollView(Context context, int maxHeight) {
            super(context);
            this.maxHeight = maxHeight;
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            int limitedHeightSpec = MeasureSpec.makeMeasureSpec(maxHeight, MeasureSpec.AT_MOST);
            super.onMeasure(widthMeasureSpec, limitedHeightSpec);
        }
    }
}
