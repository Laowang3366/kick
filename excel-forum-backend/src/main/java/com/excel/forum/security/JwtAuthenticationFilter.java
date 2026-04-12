package com.excel.forum.security;

import com.excel.forum.entity.User;
import com.excel.forum.service.UserService;
import com.excel.forum.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token)) {
            if (jwtUtil.validateToken(token)) {
                Long userId = jwtUtil.getUserIdFromToken(token);
                User user = userService.getById(userId);
                Integer tokenVersion = jwtUtil.getTokenVersionFromToken(token);

                if (user == null || user.getStatus() != null && user.getStatus() == 1) {
                    filterChain.doFilter(request, response);
                    return;
                }
                if ((user.getTokenVersion() == null ? 0 : user.getTokenVersion()) != (tokenVersion == null ? 0 : tokenVersion)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String username = user.getUsername();
                String role = user.getRole();

                String authority = "ROLE_" + role.toUpperCase();

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority(authority))
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

                request.setAttribute("userId", userId);
            }
            // token 无效时不再直接返回 401，让 Spring Security 根据路由配置决定是否需要认证
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
