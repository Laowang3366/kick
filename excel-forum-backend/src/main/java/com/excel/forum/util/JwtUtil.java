package com.excel.forum.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Component
public class JwtUtil {
    private static final String DEV_FALLBACK_SECRET = "dev-only-secret-key-please-change-in-production-at-least-256-bits-long";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private final Environment environment;
    private final StringRedisTemplate redisTemplate;

    public JwtUtil(Environment environment, StringRedisTemplate redisTemplate) {
        this.environment = environment;
        this.redisTemplate = redisTemplate;
    }

    @PostConstruct
    public void validateSecret() {
        boolean isDev = isDevelopmentProfile();
        if ((secret == null || secret.isBlank()) && isDev) {
            secret = DEV_FALLBACK_SECRET;
            return;
        }
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("生产环境必须配置 JWT_SECRET");
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Long userId, String username, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("username", username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return Long.parseLong(claims.getSubject());
    }

    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("username", String.class);
    }

    public String getRoleFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            if (isBlacklisted(token)) {
                return false;
            }
            parseToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void invalidateToken(String token) {
        if (token == null || token.isBlank()) return;
        try {
            Claims claims = parseToken(token);
            long ttl = Math.max(claims.getExpiration().getTime() - System.currentTimeMillis(), 0L);
            redisTemplate.opsForValue().set(buildBlacklistKey(token), "1", ttl, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
        }
    }

    private boolean isBlacklisted(String token) {
        try {
            Boolean exists = redisTemplate.hasKey(buildBlacklistKey(token));
            return Boolean.TRUE.equals(exists);
        } catch (RedisConnectionFailureException ignored) {
            return false;
        }
    }

    private String buildBlacklistKey(String token) {
        return "jwt:blacklist:" + token;
    }

    private boolean isDevelopmentProfile() {
        return environment.matchesProfiles("dev");
    }
}
