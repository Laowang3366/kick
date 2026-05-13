package cn.local.quicktranslate;

import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebViewStartupCleaner.clearStaleServiceWorkerData(this);
        registerPlugin(UpdateInstallerPlugin.class);
        registerPlugin(MobileFloatingTranslatePlugin.class);
        super.onCreate(savedInstanceState);
        MobileFloatingTranslatePlugin.handleSharedIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        MobileFloatingTranslatePlugin.handleSharedIntent(intent);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (MobileFloatingTranslatePlugin.handleKeyEvent(event)) {
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
}
