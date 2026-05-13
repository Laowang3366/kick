package cn.local.quicktranslate;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name = "MobileFloatingTranslate")
public class MobileFloatingTranslatePlugin extends Plugin {
    private static final String PREFS_NAME = "mobile_floating_translate";
    private static final String PREF_ENABLED = "enabled";
    private static final String PREF_TARGET_LANGUAGE = "target_language";
    private static final String PREF_TRANSLATION_FORMAT = "translation_format";
    private static final String PREF_SHORTCUT_KEY_CODE = "shortcut_key_code";
    private static final String PREF_SHORTCUT_LABEL = "shortcut_label";
    private static final String DEFAULT_TARGET_LANGUAGE = "zh-CN";
    private static final String DEFAULT_TRANSLATION_FORMAT = "plain";
    private static final String BACKEND_TRANSLATE_URL = "https://sg.lwvpscc.top/quick-translate/backend/api/translate";
    private static final int MAX_TRANSLATION_TEXT_LENGTH = 30000;

    private static MobileFloatingTranslatePlugin activePlugin;
    private static PluginCall pendingShortcutCaptureCall;
    private static String pendingSharedText = "";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View floatingView;
    private TextView resultView;
    private TextView statusView;
    private String latestTranslatedText = "";

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
            editor.putBoolean(PREF_ENABLED, enabled);
        }
        if (targetLanguage != null && !targetLanguage.trim().isEmpty()) {
            editor.putString(PREF_TARGET_LANGUAGE, targetLanguage.trim());
        }
        if (translationFormat != null && !translationFormat.trim().isEmpty()) {
            editor.putString(PREF_TRANSLATION_FORMAT, translationFormat.trim());
        }

        editor.apply();
        call.resolve(createState());
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (canDrawOverlays()) {
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
        String text = limitText(call.getString("text", ""));
        String targetLanguage = call.getString("targetLanguage", getTargetLanguage());
        String translationFormat = call.getString("translationFormat", getTranslationFormat());

        if (!canDrawOverlays()) {
            call.reject("需要先开启手机悬浮窗权限", "E_OVERLAY_PERMISSION_REQUIRED");
            return;
        }
        if (text.trim().isEmpty()) {
            call.reject("没有可翻译的文本", "E_EMPTY_TEXT");
            return;
        }

        showFloatingTranslate(text, targetLanguage, translationFormat, "手动触发");
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
        removeFloatingView();
        call.resolve(createState());
    }

    @Override
    protected void handleOnDestroy() {
        if (activePlugin == this) {
            activePlugin = null;
        }
        clearPendingShortcutCapture();
        removeFloatingView();
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    public static void handleSharedIntent(Intent intent) {
        String text = extractSharedText(intent);
        if (text.trim().isEmpty()) {
            return;
        }

        pendingSharedText = limitText(text);
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

        if (pendingShortcutCaptureCall != null) {
            activePlugin.saveShortcutKey(event.getKeyCode());
            JSObject result = activePlugin.createState();
            result.put("captured", true);
            pendingShortcutCaptureCall.resolve(result);
            pendingShortcutCaptureCall = null;
            return true;
        }

        SharedPreferences preferences = activePlugin.getPreferences();
        if (!preferences.getBoolean(PREF_ENABLED, false)) {
            return false;
        }

        int shortcutKeyCode = preferences.getInt(PREF_SHORTCUT_KEY_CODE, 0);
        if (shortcutKeyCode <= 0 || event.getKeyCode() != shortcutKeyCode) {
            return false;
        }

        activePlugin.showFromClipboard("自定义按键");
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

    private void showFromClipboard(String triggerSource) {
        if (!canDrawOverlays()) {
            Toast.makeText(getContext(), "请先开启快捷翻译悬浮窗权限", Toast.LENGTH_SHORT).show();
            return;
        }

        String text = readClipboardText();
        if (text.trim().isEmpty()) {
            Toast.makeText(getContext(), "剪切板没有可翻译内容", Toast.LENGTH_SHORT).show();
            return;
        }

        showFloatingTranslate(text, getTargetLanguage(), getTranslationFormat(), triggerSource);
    }

    private void showFloatingTranslate(String text, String targetLanguage, String translationFormat, String triggerSource) {
        mainHandler.post(() -> {
            removeFloatingView();
            latestTranslatedText = "";
            windowManager = (WindowManager) getContext().getSystemService(Context.WINDOW_SERVICE);
            floatingView = createFloatingView(text, targetLanguage, translationFormat, triggerSource);
            WindowManager.LayoutParams params = createLayoutParams();
            windowManager.addView(floatingView, params);
            runTranslation(text, targetLanguage, translationFormat);
        });
    }

    private View createFloatingView(String text, String targetLanguage, String translationFormat, String triggerSource) {
        Context context = getContext();
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        card.setBackground(createRoundedBackground(Color.WHITE, dp(18)));

        LinearLayout header = new LinearLayout(context);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);

        TextView title = new TextView(context);
        title.setText("快捷翻译");
        title.setTextColor(Color.rgb(13, 102, 216));
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextSize(15);
        header.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        TextView target = new TextView(context);
        target.setText(String.format(Locale.CHINA, "%s · %s", targetLanguage, translationFormat));
        target.setTextColor(Color.rgb(75, 85, 101));
        target.setTextSize(12);
        target.setGravity(Gravity.CENTER_VERTICAL);
        header.addView(target);

        Button copyButton = createHeaderButton("复制");
        copyButton.setOnClickListener((view) -> copyLatestResult());
        header.addView(copyButton);

        Button closeButton = createHeaderButton("关闭");
        closeButton.setOnClickListener((view) -> removeFloatingView());
        header.addView(closeButton);

        card.addView(header);
        attachDragHandler(header);

        TextView sourceView = createBodyTextView(text, Color.rgb(22, 27, 36));
        ScrollView sourceScroll = createScrollContainer(sourceView, dp(96));
        card.addView(sourceScroll);

        statusView = new TextView(context);
        statusView.setText("正在翻译中...");
        statusView.setTextColor(Color.rgb(13, 102, 216));
        statusView.setTextSize(13);
        statusView.setTypeface(Typeface.DEFAULT_BOLD);
        statusView.setPadding(0, dp(8), 0, dp(5));
        card.addView(statusView);

        resultView = createBodyTextView("译文会显示在这里", Color.rgb(75, 85, 101));
        ScrollView resultScroll = createScrollContainer(resultView, dp(128));
        card.addView(resultScroll);

        TextView footer = new TextView(context);
        footer.setText(triggerSource + " · 可拖动窗口");
        footer.setTextColor(Color.rgb(105, 115, 134));
        footer.setTextSize(12);
        footer.setPadding(0, dp(8), 0, 0);
        card.addView(footer);

        return card;
    }

    private WindowManager.LayoutParams createLayoutParams() {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int width = Math.min(getContext().getResources().getDisplayMetrics().widthPixels - dp(28), dp(380));
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            Math.max(width, dp(300)),
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(14);
        params.y = dp(88);
        return params;
    }

    private void runTranslation(String text, String targetLanguage, String translationFormat) {
        executor.execute(() -> {
            try {
                JSONObject request = new JSONObject();
                request.put("text", text);
                request.put("targetLanguage", targetLanguage);
                request.put("translationFormat", translationFormat);

                HttpURLConnection connection = (HttpURLConnection) new URL(BACKEND_TRANSLATE_URL).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(45000);
                connection.setDoOutput(true);
                connection.setRequestProperty("content-type", "application/json; charset=utf-8");

                byte[] body = request.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body);
                }

                int statusCode = connection.getResponseCode();
                String payload = readResponseBody(statusCode >= 200 && statusCode < 300 ? connection.getInputStream() : connection.getErrorStream());
                connection.disconnect();

                if (statusCode < 200 || statusCode >= 300) {
                    throw new IllegalStateException("翻译接口返回 " + statusCode);
                }

                String translatedText = new JSONObject(payload).optString("translatedText", "");
                if (translatedText.trim().isEmpty()) {
                    throw new IllegalStateException("翻译结果为空");
                }

                mainHandler.post(() -> showTranslationResult(translatedText));
            } catch (Exception ex) {
                mainHandler.post(() -> showTranslationError(ex.getMessage() == null ? "翻译失败" : ex.getMessage()));
            }
        });
    }

    private void showTranslationResult(String translatedText) {
        latestTranslatedText = translatedText;
        if (statusView != null) {
            statusView.setText("翻译完成");
            statusView.setTextColor(Color.rgb(8, 122, 75));
        }
        if (resultView != null) {
            resultView.setText(translatedText);
            resultView.setTextColor(Color.rgb(21, 25, 35));
        }
    }

    private void showTranslationError(String message) {
        if (statusView != null) {
            statusView.setText("翻译失败");
            statusView.setTextColor(Color.rgb(180, 35, 24));
        }
        if (resultView != null) {
            resultView.setText(message);
            resultView.setTextColor(Color.rgb(180, 35, 24));
        }
    }

    private void copyLatestResult() {
        if (latestTranslatedText.trim().isEmpty()) {
            Toast.makeText(getContext(), "暂无可复制译文", Toast.LENGTH_SHORT).show();
            return;
        }

        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("快捷翻译译文", latestTranslatedText));
        Toast.makeText(getContext(), "已复制译文", Toast.LENGTH_SHORT).show();
    }

    private String readClipboardText() {
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = clipboard.getPrimaryClip();
        if (clip == null || clip.getItemCount() <= 0) {
            return "";
        }

        CharSequence text = clip.getItemAt(0).coerceToText(getContext());
        return limitText(text == null ? "" : text.toString());
    }

    private void attachDragHandler(View handle) {
        handle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (floatingView == null || windowManager == null) {
                    return false;
                }
                WindowManager.LayoutParams params = (WindowManager.LayoutParams) floatingView.getLayoutParams();
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + Math.round(event.getRawX() - initialTouchX);
                        params.y = initialY + Math.round(event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                    default:
                        return false;
                }
            }
        });
    }

    private void removeFloatingView() {
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (IllegalArgumentException ignored) {}
        }
        floatingView = null;
        resultView = null;
        statusView = null;
    }

    private TextView createBodyTextView(String text, int color) {
        TextView view = new TextView(getContext());
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(15);
        view.setLineSpacing(dp(3), 1.0f);
        view.setPadding(0, dp(8), 0, dp(8));
        return view;
    }

    private ScrollView createScrollContainer(TextView textView, int maxHeight) {
        ScrollView scrollView = new ScrollView(getContext());
        scrollView.addView(textView);
        scrollView.setFillViewport(false);
        scrollView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        scrollView.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, maxHeight));
        return scrollView;
    }

    private Button createHeaderButton(String label) {
        Button button = new Button(getContext());
        button.setText(label);
        button.setTextSize(12);
        button.setTextColor(Color.rgb(13, 102, 216));
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setPadding(dp(8), 0, dp(8), 0);
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getContext().getResources().getDisplayMetrics().density);
    }

    private String readResponseBody(InputStream inputStream) throws Exception {
        if (inputStream == null) {
            return "";
        }

        try (InputStream input = inputStream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private GradientDrawable createRoundedBackground(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private void saveShortcutKey(int keyCode) {
        getPreferences()
            .edit()
            .putInt(PREF_SHORTCUT_KEY_CODE, keyCode)
            .putString(PREF_SHORTCUT_LABEL, keyCodeToLabel(keyCode))
            .apply();
    }

    private JSObject createState() {
        SharedPreferences preferences = getPreferences();
        JSObject state = new JSObject();
        state.put("available", true);
        state.put("platform", "android");
        state.put("canDrawOverlays", canDrawOverlays());
        state.put("enabled", preferences.getBoolean(PREF_ENABLED, false));
        state.put("targetLanguage", getTargetLanguage());
        state.put("translationFormat", getTranslationFormat());
        state.put("shortcutKeyCode", preferences.getInt(PREF_SHORTCUT_KEY_CODE, 0));
        state.put("shortcutLabel", preferences.getString(PREF_SHORTCUT_LABEL, ""));
        state.put("hasPendingSharedText", !pendingSharedText.trim().isEmpty());
        return state;
    }

    private boolean canDrawOverlays() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
    }

    private String getTargetLanguage() {
        return getPreferences().getString(PREF_TARGET_LANGUAGE, DEFAULT_TARGET_LANGUAGE);
    }

    private String getTranslationFormat() {
        return getPreferences().getString(PREF_TRANSLATION_FORMAT, DEFAULT_TRANSLATION_FORMAT);
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static void clearPendingShortcutCapture() {
        if (pendingShortcutCaptureCall != null) {
            pendingShortcutCaptureCall.reject("快捷键录入已取消", "E_SHORTCUT_CAPTURE_CANCELLED");
            pendingShortcutCaptureCall = null;
        }
    }

    private static String limitText(String text) {
        if (text == null) {
            return "";
        }
        String trimmed = text.trim();
        return trimmed.length() > MAX_TRANSLATION_TEXT_LENGTH ? trimmed.substring(0, MAX_TRANSLATION_TEXT_LENGTH) : trimmed;
    }

    private static String keyCodeToLabel(int keyCode) {
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
