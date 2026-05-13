package cn.local.quicktranslate;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.KeyEvent;

final class MobileFloatingTranslateSettings {
    static final String PREFS_NAME = "mobile_floating_translate";
    static final String PREF_ENABLED = "enabled";
    static final String PREF_TARGET_LANGUAGE = "target_language";
    static final String PREF_TRANSLATION_FORMAT = "translation_format";
    static final String PREF_SHORTCUT_KEY_CODE = "shortcut_key_code";
    static final String PREF_SHORTCUT_LABEL = "shortcut_label";
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

    static int getShortcutKeyCode(Context context) {
        return getPreferences(context).getInt(PREF_SHORTCUT_KEY_CODE, 0);
    }

    static void saveShortcutKey(Context context, int keyCode) {
        getPreferences(context)
            .edit()
            .putInt(PREF_SHORTCUT_KEY_CODE, keyCode)
            .putString(PREF_SHORTCUT_LABEL, keyCodeToLabel(keyCode))
            .apply();
    }

    static boolean canDrawOverlays(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context.getApplicationContext());
    }

    static boolean isAccessibilityServiceEnabled(Context context) {
        String enabledServices = Settings.Secure.getString(
            context.getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        if (enabledServices == null || enabledServices.trim().isEmpty()) {
            return false;
        }

        ComponentName expected = new ComponentName(context, MobileFloatingTranslateAccessibilityService.class);
        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabledServices);
        while (splitter.hasNext()) {
            ComponentName enabled = ComponentName.unflattenFromString(splitter.next());
            if (expected.equals(enabled)) {
                return true;
            }
        }
        return false;
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

    static String keyCodeToLabel(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_VOLUME_DOWN:
                return "音量下键";
            case KeyEvent.KEYCODE_VOLUME_UP:
                return "音量上键";
            case KeyEvent.KEYCODE_HEADSETHOOK:
                return "耳机按键";
            case KeyEvent.KEYCODE_CAMERA:
                return "相机键";
            case KeyEvent.KEYCODE_BACK:
                return "返回键";
            default:
                return KeyEvent.keyCodeToString(keyCode).replace("KEYCODE_", "").replace("_", " ");
        }
    }
}
