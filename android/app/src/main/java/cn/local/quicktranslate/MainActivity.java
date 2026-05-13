package cn.local.quicktranslate;

import android.content.Intent;
import android.os.Bundle;
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
}
