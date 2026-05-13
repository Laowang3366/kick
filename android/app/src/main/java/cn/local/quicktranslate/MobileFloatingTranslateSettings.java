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
    static final String DEFAULT_TARGET_LANGUAGE = "zh-CN";
    static final String DEFAULT_TRANSLATION_FORMAT = "plain";
    static final String BACKEND_TRANSLATE_URL = "https://sg.lwvpscc.top/quick-translate/backend/api/translate";
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

    static boolean canDrawOverlays(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context.getApplicationContext());
    }

    static String readClipboardText(Context context) {
        ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) {
            return "";
        }

        ClipData clip = clipboard.getPrimaryClip();
        if (clip == null || clip.getItemCount() <= 0) {
            return "";
        }

        CharSequence text = clip.getItemAt(0).coerceToText(context);
        return limitText(text == null ? "" : text.toString());
    }

    static void copyToClipboard(Context context, String label, String text) {
        ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText(label, text));
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
