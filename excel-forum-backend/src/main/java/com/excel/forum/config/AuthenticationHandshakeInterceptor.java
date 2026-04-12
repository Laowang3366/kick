package com.excel.forum.config;

import com.excel.forum.entity.User;
import com.excel.forum.service.UserService;
import com.excel.forum.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthenticationHandshakeInterceptor implements HandshakeInterceptor {
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = extractToken(request);
        if (!StringUtils.hasText(token) || !jwtUtil.validateToken(token)) {
            return false;
        }
        Long userId = jwtUtil.getUserIdFromToken(token);
        User user = userService.getById(userId);
        Integer tokenVersion = jwtUtil.getTokenVersionFromToken(token);
        if (user == null || user.getStatus() != null && user.getStatus() == 1) {
            return false;
        }
        if ((user.getTokenVersion() == null ? 0 : user.getTokenVersion()) != (tokenVersion == null ? 0 : tokenVersion)) {
            return false;
        }
        attributes.put("userId", userId);
        attributes.put("username", user.getUsername());
        attributes.put("role", user.getRole());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            String token = httpRequest.getParameter("token");
            if (StringUtils.hasText(token)) {
                return token;
            }
        }
        return null;
    }
}
