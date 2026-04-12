package com.excel.forum.util;

import java.util.Locale;
import java.util.Set;

public final class UsernamePolicy {
    private static final int MIN_LENGTH = 2;
    private static final int MAX_LENGTH = 30;
    private static final Set<String> RESERVED = Set.of(
            "admin",
            "administrator",
            "moderator",
            "official",
            "system",
            "support",
            "service",
            "root",
            "管理员",
            "版主",
            "官方",
            "系统",
            "客服"
    );

    private UsernamePolicy() {
    }

    public static String normalize(String value) {
        return value == null ? null : value.trim();
    }

    public static boolean isValid(String username) {
        if (username == null) {
            return false;
        }
        String normalized = normalize(username);
        if (normalized == null || normalized.length() < MIN_LENGTH || normalized.length() > MAX_LENGTH) {
            return false;
        }
        return normalized.matches("^[A-Za-z0-9_\\-\\u4e00-\\u9fa5]+$");
    }

    public static boolean isReserved(String username) {
        if (username == null) {
            return false;
        }
        String normalized = username
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[_\\-\\s]+", "");
        return RESERVED.contains(normalized);
    }
}
