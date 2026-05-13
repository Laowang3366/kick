package cn.local.quicktranslate;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

public final class MobileFloatingBubbleService extends Service {
    private static final int BUBBLE_SIZE_DP = 54;

    private WindowManager windowManager;
    private View bubbleView;

    static void sync(Context context) {
        Context appContext = context.getApplicationContext();
        Intent intent = new Intent(appContext, MobileFloatingBubbleService.class);
        if (MobileFloatingTranslateSettings.isEnabled(appContext) && MobileFloatingTranslateSettings.canDrawOverlays(appContext)) {
            try {
                appContext.startService(intent);
            } catch (RuntimeException error) {
                Toast.makeText(appContext, "悬浮球启动失败：" + error.getMessage(), Toast.LENGTH_SHORT).show();
            }
            return;
        }

        appContext.stopService(intent);
        MobileFloatingTranslateOverlay.get(appContext).hide();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!MobileFloatingTranslateSettings.isEnabled(this) || !MobileFloatingTranslateSettings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        showBubble();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        removeBubble();
        super.onDestroy();
    }

    private void showBubble() {
        if (bubbleView != null) {
            return;
        }

        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) {
            stopSelf();
            return;
        }

        bubbleView = createBubbleView();
        try {
            windowManager.addView(bubbleView, createLayoutParams());
        } catch (RuntimeException error) {
            bubbleView = null;
            Toast.makeText(this, "悬浮球显示失败：" + error.getMessage(), Toast.LENGTH_SHORT).show();
            stopSelf();
        }
    }

    private TextView createBubbleView() {
        TextView bubble = new TextView(this);
        bubble.setText("译");
        bubble.setTextColor(Color.WHITE);
        bubble.setTextSize(20);
        bubble.setTypeface(Typeface.DEFAULT_BOLD);
        bubble.setGravity(Gravity.CENTER);
        bubble.setBackground(createCircleBackground());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bubble.setElevation(dp(10));
        }
        bubble.setOnClickListener((view) -> MobileFloatingTranslateOverlay.get(this).showFromClipboardOrManual("悬浮球"));
        attachDragHandler(bubble);
        return bubble;
    }

    private WindowManager.LayoutParams createLayoutParams() {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int size = dp(BUBBLE_SIZE_DP);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            size,
            size,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = Math.max(dp(12), getResources().getDisplayMetrics().widthPixels - dp(74));
        params.y = dp(160);
        return params;
    }

    private void attachDragHandler(View handle) {
        handle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean dragging;

            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (bubbleView == null || windowManager == null) {
                    return false;
                }

                WindowManager.LayoutParams params = (WindowManager.LayoutParams) bubbleView.getLayoutParams();
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        dragging = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int deltaX = Math.round(event.getRawX() - initialTouchX);
                        int deltaY = Math.round(event.getRawY() - initialTouchY);
                        if (!dragging && Math.abs(deltaX) < dp(6) && Math.abs(deltaY) < dp(6)) {
                            return true;
                        }
                        dragging = true;
                        params.x = clamp(initialX + deltaX, 0, getResources().getDisplayMetrics().widthPixels - dp(BUBBLE_SIZE_DP));
                        params.y = clamp(initialY + deltaY, 0, getResources().getDisplayMetrics().heightPixels - dp(BUBBLE_SIZE_DP));
                        windowManager.updateViewLayout(bubbleView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!dragging) {
                            view.performClick();
                        }
                        return true;
                    default:
                        return false;
                }
            }
        });
    }

    private void removeBubble() {
        if (bubbleView != null && windowManager != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (IllegalArgumentException ignored) {}
        }
        bubbleView = null;
        windowManager = null;
    }

    private GradientDrawable createCircleBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.OVAL);
        drawable.setColor(Color.rgb(13, 102, 216));
        return drawable;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
