package cn.local.quicktranslate;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

final class MobileFloatingTranslateSettings {
    static final String PREFS_NAME = "mobile_floating_translate";
    static final String PREF_ENABLED = "enabled";
    static final String PREF_TARGET_LANGUAGE = "target_language";
    static final String PREF_TRANSLATION_FORMAT = "translation_format";
    static final String PREF_BUBBLE_ON_RIGHT = "bubble_on_right";
    static final String PREF_BUBBLE_Y = "bubble_y";
    static final String DEFAULT_TARGET_LANGUAGE = "zh-CN";
    static final String DEFAULT_TRANSLATION_FORMAT = "plain";
    static final String BACKEND_TRANSLATE_URL = "https://sg.lwvpscc.top/quick-translate/backend/api/translate";
    static final String BACKEND_TRANSLATE_FALLBACK_URL = "http://64.90.12.101/quick-translate/backend/api/translate";
    static final int MAX_TRANSLATION_TEXT_LENGTH = 30000;

    private MobileFloatingTranslateSettings() {}

    static SharedPreferences getPreferences(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static boolean isEnabled(Context context) {
        return getPreferences(context).getBoolean(PREF_ENABLED, false);
    }

    static String getTargetLanguage(Context context) {
        return getPreferences(context).getString(PREF_TARGET_LANGUAGE, DEFAULT_TARGET_LANGUAGE);
    }

    static String getTranslationFormat(Context context) {
        return getPreferences(context).getString(PREF_TRANSLATION_FORMAT, DEFAULT_TRANSLATION_FORMAT);
    }

    static void saveTargetLanguage(Context context, String targetLanguage) {
        getPreferences(context).edit().putString(PREF_TARGET_LANGUAGE, targetLanguage).apply();
    }

    static boolean isBubbleOnRight(Context context) {
        return getPreferences(context).getBoolean(PREF_BUBBLE_ON_RIGHT, true);
    }

    static int getBubbleY(Context context, int fallbackY) {
        return getPreferences(context).getInt(PREF_BUBBLE_Y, fallbackY);
    }

    static void saveBubblePosition(Context context, boolean onRight, int y) {
        getPreferences(context)
            .edit()
            .putBoolean(PREF_BUBBLE_ON_RIGHT, onRight)
            .putInt(PREF_BUBBLE_Y, y)
            .apply();
    }

    static boolean canDrawOverlays(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context.getApplicationContext());
    }

    static String readClipboardText(Context context) {
        ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) {
            return "";
        }

        try {
            if (!clipboard.hasPrimaryClip()) {
                return "";
            }

            ClipData clip = clipboard.getPrimaryClip();
            if (clip == null || clip.getItemCount() <= 0) {
                return "";
            }

            ClipData.Item item = clip.getItemAt(0);
            CharSequence text = item.getText();
            if (text == null) {
                text = item.coerceToText(context);
            }
            return limitText(text == null ? "" : text.toString());
        } catch (SecurityException error) {
            return "";
        }
    }

    static void copyToClipboard(Context context, String label, String text) {
        ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            try {
                clipboard.setPrimaryClip(ClipData.newPlainText(label, text));
            } catch (SecurityException ignored) {}
        }
    }

    static String limitText(String text) {
        if (text == null) {
            return "";
        }
        String trimmed = text.trim();
        return trimmed.length() > MAX_TRANSLATION_TEXT_LENGTH ? trimmed.substring(0, MAX_TRANSLATION_TEXT_LENGTH) : trimmed;
    }
}
