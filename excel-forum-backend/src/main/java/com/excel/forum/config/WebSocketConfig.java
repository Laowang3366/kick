package com.excel.forum.config;

import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private static final String DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173";

    private final AuthenticationHandshakeInterceptor authenticationHandshakeInterceptor;
    private final Environment environment;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] allowedOrigins = Arrays.stream(environment.getProperty("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .peek(value -> {
                    if (!environment.matchesProfiles("dev") && value.contains("*")) {
                        throw new IllegalStateException("生产环境 ALLOWED_ORIGINS 不允许使用通配符");
                    }
                })
                .toArray(String[]::new);
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins)
                .addInterceptors(authenticationHandshakeInterceptor)
                .withSockJS();
    }
}
