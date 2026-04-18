package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Constructor;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SearchControllerTest {

    @Test
    void searchAllReturnsMixedResults() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(get("/api/search/all").param("q", "vlookup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tutorials[0].type").value("tutorial"))
                .andExpect(jsonPath("$.questions[0].type").value("question"))
                .andExpect(jsonPath("$.functions[0].type").value("function"));
    }

    @Test
    void searchFunctionsReturnsFunctionResults() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(get("/api/search/functions").param("q", "lookup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].title").value("VLOOKUP"))
                .andExpect(jsonPath("$.records[0].targetUrl").value("/?article=201"));
    }

    private MockMvc buildMockMvc() {
        try {
            Class<?> controllerType = Class.forName("com.excel.forum.controller.SearchController");
            Class<?> serviceType = Class.forName("com.excel.forum.service.SearchService");
            Object service = Proxy.newProxyInstance(
                    serviceType.getClassLoader(),
                    new Class[]{serviceType},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "searchAll" -> Map.of(
                                "tutorials", List.of(Map.of("type", "tutorial", "title", "VLOOKUP 教程")),
                                "questions", List.of(Map.of("type", "question", "title", "VLOOKUP 练习题")),
                                "functions", List.of(Map.of("type", "function", "title", "VLOOKUP"))
                        );
                        case "searchFunctions" -> Map.of(
                                "records", List.of(Map.of(
                                        "type", "function",
                                        "id", "fn:vlookup",
                                        "title", "VLOOKUP",
                                        "summary", "查找引用函数",
                                        "tags", List.of("查找引用"),
                                        "targetUrl", "/?article=201"
                                ))
                        );
                        case "searchTutorials" -> Map.of("records", List.of());
                        case "searchQuestions" -> Map.of("records", List.of());
                        default -> null;
                    }
            );
            Constructor<?> constructor = controllerType.getDeclaredConstructor(serviceType);
            Object controller = constructor.newInstance(service);
            return MockMvcBuilders.standaloneSetup(controller)
                    .setControllerAdvice(new GlobalExceptionHandler())
                    .build();
        } catch (ClassNotFoundException e) {
            throw new AssertionError("SearchController or SearchService is missing", e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
