package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Constructor;
import java.lang.reflect.Proxy;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MallControllerTest {

    @Test
    void getItemsReturnsGoneWhenMallIsOffline() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(get("/api/mall/items").requestAttr("userId", 7L))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.message").value("积分商城已下线"));
    }

    @Test
    void redeemReturnsGoneWhenMallIsOffline() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(post("/api/mall/redeem")
                        .requestAttr("userId", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemId\":1}"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.message").value("积分商城已下线"));
    }

    private MockMvc buildMockMvc() {
        try {
            Class<?> controllerType = Class.forName("com.excel.forum.controller.MallController");
            Object controller = instantiateController(controllerType);
            return MockMvcBuilders.standaloneSetup(controller)
                    .setControllerAdvice(new GlobalExceptionHandler())
                    .build();
        } catch (ClassNotFoundException e) {
            throw new AssertionError("MallController is missing", e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Object instantiateController(Class<?> controllerType) throws Exception {
        for (Constructor<?> constructor : controllerType.getDeclaredConstructors()) {
            constructor.setAccessible(true);
            if (constructor.getParameterCount() == 0) {
                return constructor.newInstance();
            }
            if (constructor.getParameterCount() == 1) {
                Class<?> dependencyType = constructor.getParameterTypes()[0];
                Object dependency = Proxy.newProxyInstance(
                        dependencyType.getClassLoader(),
                        new Class[]{dependencyType},
                        (proxy, method, args) -> {
                            if (Map.class.isAssignableFrom(method.getReturnType())) {
                                return Map.of();
                            }
                            return null;
                        }
                );
                return constructor.newInstance(dependency);
            }
        }
        throw new AssertionError("MallController constructor not supported");
    }
}
