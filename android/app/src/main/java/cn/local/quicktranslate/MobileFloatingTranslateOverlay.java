package cn.local.quicktranslate;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

final class MobileFloatingTranslateOverlay {
    private static MobileFloatingTranslateOverlay sharedOverlay;

    private final Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View floatingView;
    private TextView resultView;
    private TextView statusView;
    private String latestTranslatedText = "";

    private MobileFloatingTranslateOverlay(Context context) {
        this.context = context.getApplicationContext();
    }

    static synchronized MobileFloatingTranslateOverlay get(Context context) {
        if (sharedOverlay == null) {
            sharedOverlay = new MobileFloatingTranslateOverlay(context);
        }
        return sharedOverlay;
    }

    void showFromClipboard(String triggerSource) {
        if (!MobileFloatingTranslateSettings.canDrawOverlays(context)) {
            Toast.makeText(context, "请先开启快捷翻译悬浮窗权限", Toast.LENGTH_SHORT).show();
            return;
        }

        String text = MobileFloatingTranslateSettings.readClipboardText(context);
        if (text.trim().isEmpty()) {
            Toast.makeText(context, "剪切板没有可翻译内容", Toast.LENGTH_SHORT).show();
            return;
        }

        showFloatingTranslate(
            text,
            MobileFloatingTranslateSettings.getTargetLanguage(context),
            MobileFloatingTranslateSettings.getTranslationFormat(context),
            triggerSource
        );
    }

    void showFloatingTranslate(String text, String targetLanguage, String translationFormat, String triggerSource) {
        mainHandler.post(() -> {
            removeFloatingView();
            latestTranslatedText = "";
            windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
            if (windowManager == null) {
                Toast.makeText(context, "无法创建悬浮翻译窗", Toast.LENGTH_SHORT).show();
                return;
            }

            floatingView = createFloatingView(text, targetLanguage, translationFormat, triggerSource);
            WindowManager.LayoutParams params = createLayoutParams();
            try {
                windowManager.addView(floatingView, params);
                runTranslation(text, targetLanguage, translationFormat);
            } catch (RuntimeException error) {
                floatingView = null;
                Toast.makeText(context, "悬浮窗打开失败：" + error.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    void hide() {
        mainHandler.post(this::removeFloatingView);
    }

    private View createFloatingView(String text, String targetLanguage, String translationFormat, String triggerSource) {
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
        int width = Math.min(context.getResources().getDisplayMetrics().widthPixels - dp(28), dp(380));
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

                HttpURLConnection connection = (HttpURLConnection) new URL(MobileFloatingTranslateSettings.BACKEND_TRANSLATE_URL).openConnection();
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
            Toast.makeText(context, "暂无可复制译文", Toast.LENGTH_SHORT).show();
            return;
        }

        MobileFloatingTranslateSettings.copyToClipboard(context, "快捷翻译译文", latestTranslatedText);
        Toast.makeText(context, "已复制译文", Toast.LENGTH_SHORT).show();
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
        TextView view = new TextView(context);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(15);
        view.setLineSpacing(dp(3), 1.0f);
        view.setPadding(0, dp(8), 0, dp(8));
        return view;
    }

    private ScrollView createScrollContainer(TextView textView, int maxHeight) {
        ScrollView scrollView = new ScrollView(context);
        scrollView.addView(textView);
        scrollView.setFillViewport(false);
        scrollView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        scrollView.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, maxHeight));
        return scrollView;
    }

    private Button createHeaderButton(String label) {
        Button button = new Button(context);
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
        return Math.round(value * context.getResources().getDisplayMetrics().density);
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
}
