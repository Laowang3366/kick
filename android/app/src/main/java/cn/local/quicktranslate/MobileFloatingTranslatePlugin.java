package cn.local.quicktranslate;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import android.view.KeyEvent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MobileFloatingTranslate")
public class MobileFloatingTranslatePlugin extends Plugin {
    private static MobileFloatingTranslatePlugin activePlugin;
    private static PluginCall pendingShortcutCaptureCall;
    private static String pendingSharedText = "";

    @Override
    public void load() {
        activePlugin = this;
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(createState());
    }

    @PluginMethod
    public void configure(PluginCall call) {
        SharedPreferences.Editor editor = getPreferences().edit();
        Boolean enabled = call.getBoolean("enabled");
        String targetLanguage = call.getString("targetLanguage");
        String translationFormat = call.getString("translationFormat");

        if (enabled != null) {
            editor.putBoolean(MobileFloatingTranslateSettings.PREF_ENABLED, enabled);
        }
        if (targetLanguage != null && !targetLanguage.trim().isEmpty()) {
            editor.putString(MobileFloatingTranslateSettings.PREF_TARGET_LANGUAGE, targetLanguage.trim());
        }
        if (translationFormat != null && !translationFormat.trim().isEmpty()) {
            editor.putString(MobileFloatingTranslateSettings.PREF_TRANSLATION_FORMAT, translationFormat.trim());
        }

        editor.apply();
        call.resolve(createState());
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (MobileFloatingTranslateSettings.canDrawOverlays(getContext())) {
            call.resolve(createState());
            return;
        }

        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve(createState());
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve(createState());
    }

    @PluginMethod
    public void startShortcutCapture(PluginCall call) {
        if (pendingShortcutCaptureCall != null) {
            pendingShortcutCaptureCall.reject("已有快捷键录入正在进行", "E_SHORTCUT_CAPTURE_BUSY");
        }

        pendingShortcutCaptureCall = call;
    }

    @PluginMethod
    public void cancelShortcutCapture(PluginCall call) {
        clearPendingShortcutCapture();
        call.resolve(createState());
    }

    @PluginMethod
    public void showFloatingTranslate(PluginCall call) {
        String text = MobileFloatingTranslateSettings.limitText(call.getString("text", ""));
        String targetLanguage = call.getString("targetLanguage", getTargetLanguage());
        String translationFormat = call.getString("translationFormat", getTranslationFormat());

        if (!MobileFloatingTranslateSettings.canDrawOverlays(getContext())) {
            call.reject("需要先开启手机悬浮窗权限", "E_OVERLAY_PERMISSION_REQUIRED");
            return;
        }
        if (text.trim().isEmpty()) {
            call.reject("没有可翻译的文本", "E_EMPTY_TEXT");
            return;
        }

        MobileFloatingTranslateOverlay.get(getContext()).showFloatingTranslate(text, targetLanguage, translationFormat, "手动触发");
        call.resolve(createState());
    }

    @PluginMethod
    public void consumePendingSharedText(PluginCall call) {
        JSObject result = new JSObject();
        result.put("text", pendingSharedText);
        pendingSharedText = "";
        call.resolve(result);
    }

    @PluginMethod
    public void hideFloatingTranslate(PluginCall call) {
        MobileFloatingTranslateOverlay.get(getContext()).hide();
        call.resolve(createState());
    }

    @Override
    protected void handleOnDestroy() {
        if (activePlugin == this) {
            activePlugin = null;
        }
        clearPendingShortcutCapture();
        super.handleOnDestroy();
    }

    public static void handleSharedIntent(Intent intent) {
        String text = extractSharedText(intent);
        if (text.trim().isEmpty()) {
            return;
        }

        pendingSharedText = MobileFloatingTranslateSettings.limitText(text);
        if (activePlugin != null) {
            JSObject data = new JSObject();
            data.put("text", pendingSharedText);
            activePlugin.notifyListeners("sharedText", data, true);
        }
    }

    public static boolean handleKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN || activePlugin == null) {
            return false;
        }

        if (resolvePendingShortcutCapture(activePlugin.getContext(), event.getKeyCode())) {
            return true;
        }

        if (!MobileFloatingTranslateSettings.isEnabled(activePlugin.getContext())) {
            return false;
        }

        int shortcutKeyCode = MobileFloatingTranslateSettings.getShortcutKeyCode(activePlugin.getContext());
        if (shortcutKeyCode <= 0 || event.getKeyCode() != shortcutKeyCode) {
            return false;
        }

        MobileFloatingTranslateOverlay.get(activePlugin.getContext()).showFromClipboard("自定义按键");
        return true;
    }

    static boolean resolvePendingShortcutCapture(Context context, int keyCode) {
        if (pendingShortcutCaptureCall == null) {
            return false;
        }

        MobileFloatingTranslateSettings.saveShortcutKey(context, keyCode);
        JSObject result = activePlugin != null ? activePlugin.createState() : new JSObject();
        result.put("captured", true);
        pendingShortcutCaptureCall.resolve(result);
        pendingShortcutCaptureCall = null;
        return true;
    }

    private static String extractSharedText(Intent intent) {
        if (intent == null) {
            return "";
        }

        String action = intent.getAction();
        if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
            CharSequence processText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            return processText == null ? "" : processText.toString();
        }

        if (!Intent.ACTION_SEND.equals(action)) {
            return "";
        }

        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        CharSequence subject = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
        StringBuilder builder = new StringBuilder();
        if (subject != null && subject.length() > 0) {
            builder.append(subject);
        }
        if (text != null && text.length() > 0) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(text);
        }
        return builder.toString();
    }

    private JSObject createState() {
        SharedPreferences preferences = getPreferences();
        JSObject state = new JSObject();
        state.put("available", true);
        state.put("platform", "android");
        state.put("canDrawOverlays", MobileFloatingTranslateSettings.canDrawOverlays(getContext()));
        state.put("canListenKeyEvents", MobileFloatingTranslateSettings.isAccessibilityServiceEnabled(getContext()));
        state.put("enabled", preferences.getBoolean(MobileFloatingTranslateSettings.PREF_ENABLED, false));
        state.put("targetLanguage", getTargetLanguage());
        state.put("translationFormat", getTranslationFormat());
        state.put("shortcutKeyCode", preferences.getInt(MobileFloatingTranslateSettings.PREF_SHORTCUT_KEY_CODE, 0));
        state.put("shortcutLabel", preferences.getString(MobileFloatingTranslateSettings.PREF_SHORTCUT_LABEL, ""));
        state.put("hasPendingSharedText", !pendingSharedText.trim().isEmpty());
        return state;
    }

    private String getTargetLanguage() {
        return getPreferences().getString(
            MobileFloatingTranslateSettings.PREF_TARGET_LANGUAGE,
            MobileFloatingTranslateSettings.DEFAULT_TARGET_LANGUAGE
        );
    }

    private String getTranslationFormat() {
        return getPreferences().getString(
            MobileFloatingTranslateSettings.PREF_TRANSLATION_FORMAT,
            MobileFloatingTranslateSettings.DEFAULT_TRANSLATION_FORMAT
        );
    }

    private SharedPreferences getPreferences() {
        return MobileFloatingTranslateSettings.getPreferences(getContext());
    }

    private static void clearPendingShortcutCapture() {
        if (pendingShortcutCaptureCall != null) {
            pendingShortcutCaptureCall.reject("快捷键录入已取消", "E_SHORTCUT_CAPTURE_CANCELLED");
            pendingShortcutCaptureCall = null;
        }
    }
}
