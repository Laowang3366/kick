package cn.local.quicktranslate;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

public class MobileFloatingTranslateAccessibilityService extends AccessibilityService {
    @Override
    protected void onServiceConnected() {
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
            setServiceInfo(info);
        }
        super.onServiceConnected();
    }

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN) {
            return false;
        }

        if (MobileFloatingTranslatePlugin.resolvePendingShortcutCapture(this, event.getKeyCode())) {
            return true;
        }

        if (!MobileFloatingTranslateSettings.isEnabled(this)) {
            return false;
        }

        int shortcutKeyCode = MobileFloatingTranslateSettings.getShortcutKeyCode(this);
        if (shortcutKeyCode <= 0 || event.getKeyCode() != shortcutKeyCode) {
            return false;
        }

        MobileFloatingTranslateOverlay.get(this).showFromClipboard("全局按键触发");
        return true;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {}
}
