package cn.local.quicktranslate;

import android.content.Context;
import java.io.File;

final class WebViewStartupCleaner {
    private WebViewStartupCleaner() {}

    static void clearStaleServiceWorkerData(Context context) {
        File defaultWebViewDir = new File(context.getDataDir(), "app_webview/Default");
        deleteRecursively(new File(defaultWebViewDir, "Service Worker"));
        deleteRecursively(new File(defaultWebViewDir, "Cache"));
        deleteRecursively(new File(defaultWebViewDir, "Code Cache"));
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) {
            return;
        }

        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }

        file.delete();
    }
}
