package com.excel.forum.config;

import com.excel.forum.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private static final String DEFAULT_ALLOWED_ORIGINS = "http://localhost:*,http://127.0.0.1:*";

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final Environment environment;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                    .frameOptions(frame -> frame.deny())
                    .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                    .httpStrictTransportSecurity(hsts -> hsts
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000)
                    )
                    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none'"))
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/auth/**")).permitAll()



                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/categories/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/notifications/announcements")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/notifications/announcements/*")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/posts/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/posts")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/posts/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.PUT, "/api/posts/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.DELETE, "/api/posts/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/public/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/users/online")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/center-overview")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/posts")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/replies")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/favorites")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/following")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/users/*/followers")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/users/category-follows/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/users/heartbeat")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/users/search")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/users/recent")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/practice/categories")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/practice/question-list")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/practice/leaderboard")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/practice/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/chat/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/messages/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/feedback/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/drafts/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/upload")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/tools/convert")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/mall/items")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/mall/types")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/mall/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/uploads/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/ws/**")).authenticated()
                // moderator 可访问的审核、举报、统计接口
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/posts/review")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/posts/*/review")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/stats")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/reports")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/reports/*/handle")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/feedback")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/feedback/*/handle")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/categories")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/admin/posts")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/posts/*/lock")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/posts/*/top")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/posts/*/essence")).hasAnyRole("ADMIN", "MODERATOR")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/**")).hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(resolveAllowedOrigins());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        String configuredOrigins = environment.getProperty("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS);
        return Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
