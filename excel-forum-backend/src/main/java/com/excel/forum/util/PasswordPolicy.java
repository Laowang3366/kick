package com.excel.forum.util;

public final class PasswordPolicy {
    public static final String SIMPLE_PASSWORD_PATTERN = "^[A-Za-z0-9]{8,}$";

    private PasswordPolicy() {
    }

    public static boolean isStrongPassword(String password) {
        return password != null && password.matches(SIMPLE_PASSWORD_PATTERN);
    }
}
