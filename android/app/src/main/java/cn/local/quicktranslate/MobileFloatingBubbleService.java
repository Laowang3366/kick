package cn.local.quicktranslate;

import android.animation.ValueAnimator;
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
    private static final int BUBBLE_WIDTH_DP = 28;
    private static final int BUBBLE_HEIGHT_DP = 54;
    private static final String ACTION_MOVE_BUBBLE = "cn.local.quicktranslate.MOVE_FLOATING_BUBBLE";
    private static final String ACTION_SET_BUBBLE_EXPANDED = "cn.local.quicktranslate.SET_FLOATING_BUBBLE_EXPANDED";
    private static final String EXTRA_ON_RIGHT = "onRight";
    private static final String EXTRA_Y = "y";
    private static final String EXTRA_EXPANDED = "expanded";

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

    static void moveBubbleToEdge(Context context, boolean onRight, int y) {
        Context appContext = context.getApplicationContext();
        MobileFloatingTranslateSettings.saveBubblePosition(appContext, onRight, y);
        Intent intent = new Intent(appContext, MobileFloatingBubbleService.class);
        intent.setAction(ACTION_MOVE_BUBBLE);
        intent.putExtra(EXTRA_ON_RIGHT, onRight);
        intent.putExtra(EXTRA_Y, y);
        try {
            appContext.startService(intent);
        } catch (RuntimeException ignored) {}
    }

    static void setBubbleExpanded(Context context, boolean expanded) {
        Context appContext = context.getApplicationContext();
        Intent intent = new Intent(appContext, MobileFloatingBubbleService.class);
        intent.setAction(ACTION_SET_BUBBLE_EXPANDED);
        intent.putExtra(EXTRA_EXPANDED, expanded);
        try {
            appContext.startService(intent);
        } catch (RuntimeException ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!MobileFloatingTranslateSettings.isEnabled(this) || !MobileFloatingTranslateSettings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        showBubble();
        if (ACTION_MOVE_BUBBLE.equals(intent == null ? null : intent.getAction())) {
            boolean onRight = intent.getBooleanExtra(EXTRA_ON_RIGHT, true);
            int y = intent.getIntExtra(EXTRA_Y, dp(160));
            moveBubble(onRight, y, true);
        } else if (ACTION_SET_BUBBLE_EXPANDED.equals(intent == null ? null : intent.getAction())) {
            applyExpandedState(intent.getBooleanExtra(EXTRA_EXPANDED, false), true);
        }
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
        bubble.setTextColor(Color.argb(160, 255, 255, 255));
        bubble.setTextSize(14);
        bubble.setTypeface(Typeface.DEFAULT_BOLD);
        bubble.setGravity(Gravity.CENTER);
        bubble.setBackground(createBubbleBackground());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bubble.setElevation(dp(8));
        }
        bubble.setOnClickListener((view) -> {
            WindowManager.LayoutParams params = bubbleView == null ? null : (WindowManager.LayoutParams) bubbleView.getLayoutParams();
            int anchorX = params == null ? getDisplayWidth() - dp(BUBBLE_WIDTH_DP) : params.x;
            int anchorY = params == null ? dp(160) : params.y;
            setBubbleExpanded(this, true);
            MobileFloatingTranslateOverlay.get(this).showFromClipboardOrManual("悬浮球", anchorX, anchorY);
        });
        attachDragHandler(bubble);
        return bubble;
    }

    private WindowManager.LayoutParams createLayoutParams() {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int width = dp(BUBBLE_WIDTH_DP);
        int height = dp(BUBBLE_HEIGHT_DP);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            width,
            height,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        boolean onRight = MobileFloatingTranslateSettings.isBubbleOnRight(this);
        int fallbackY = Math.max(dp(160), getDisplayHeight() / 2 - height / 2);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = onRight ? getDisplayWidth() - width + dp(8) : -dp(8);
        params.y = clamp(MobileFloatingTranslateSettings.getBubbleY(this, fallbackY), dp(80), getDisplayHeight() - height - dp(80));
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
                        params.x = clamp(initialX + deltaX, -dp(12), getDisplayWidth() - dp(BUBBLE_WIDTH_DP) + dp(12));
                        params.y = clamp(initialY + deltaY, dp(56), getDisplayHeight() - dp(BUBBLE_HEIGHT_DP) - dp(56));
                        windowManager.updateViewLayout(bubbleView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!dragging) {
                            view.performClick();
                        } else {
                            boolean onRight = params.x + dp(BUBBLE_WIDTH_DP) / 2 >= getDisplayWidth() / 2;
                            moveBubble(onRight, params.y, true);
                        }
                        return true;
                    default:
                        return false;
                }
            }
        });
    }

    private void moveBubble(boolean onRight, int y, boolean animated) {
        if (bubbleView == null || windowManager == null) {
            return;
        }

        WindowManager.LayoutParams params = (WindowManager.LayoutParams) bubbleView.getLayoutParams();
        int targetX = onRight ? getDisplayWidth() - dp(BUBBLE_WIDTH_DP) + dp(8) : -dp(8);
        int targetY = clamp(y, dp(56), getDisplayHeight() - dp(BUBBLE_HEIGHT_DP) - dp(56));
        MobileFloatingTranslateSettings.saveBubblePosition(this, onRight, targetY);
        if (!animated) {
            params.x = targetX;
            params.y = targetY;
            windowManager.updateViewLayout(bubbleView, params);
            return;
        }

        int startX = params.x;
        int startY = params.y;
        ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(160);
        animator.addUpdateListener((animation) -> {
            float progress = (float) animation.getAnimatedValue();
            params.x = Math.round(startX + (targetX - startX) * progress);
            params.y = Math.round(startY + (targetY - startY) * progress);
            try {
                windowManager.updateViewLayout(bubbleView, params);
            } catch (IllegalArgumentException ignored) {}
        });
        animator.start();
    }

    private void applyExpandedState(boolean expanded, boolean animated) {
        if (bubbleView == null) {
            return;
        }

        bubbleView.animate().cancel();
        bubbleView.animate().setListener(null);
        if (expanded) {
            if (!animated) {
                bubbleView.setVisibility(View.INVISIBLE);
                bubbleView.setAlpha(0f);
                return;
            }

            bubbleView.animate()
                .alpha(0f)
                .setDuration(110)
                .withEndAction(() -> bubbleView.setVisibility(View.INVISIBLE))
                .start();
            return;
        }

        bubbleView.setVisibility(View.VISIBLE);
        if (!animated) {
            bubbleView.setAlpha(1f);
            return;
        }

        bubbleView.setAlpha(0f);
        bubbleView.animate()
            .alpha(1f)
            .setDuration(140)
            .start();
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

    private GradientDrawable createBubbleBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(Color.argb(76, 13, 102, 216));
        drawable.setCornerRadius(dp(18));
        return drawable;
    }

    private int getDisplayWidth() {
        return getResources().getDisplayMetrics().widthPixels;
    }

    private int getDisplayHeight() {
        return getResources().getDisplayMetrics().heightPixels;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
