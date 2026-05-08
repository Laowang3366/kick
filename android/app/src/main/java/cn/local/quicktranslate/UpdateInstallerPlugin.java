package cn.local.quicktranslate;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void installUpdateApk(PluginCall call) {
        String url = call.getString("url");
        String expectedSha512 = call.getString("sha512");

        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required", "E_URL_REQUIRED");
            return;
        }

        executor.execute(() -> {
            File apk = null;
            try {
                apk = downloadApk(url.trim());

                if (expectedSha512 != null && !expectedSha512.trim().isEmpty() && !matchesSha512(apk, expectedSha512)) {
                    apk.delete();
                    call.reject("APK SHA-512 verification failed", "E_SHA512_MISMATCH");
                    return;
                }

                openInstaller(apk);

                JSObject result = new JSObject();
                result.put("path", apk.getAbsolutePath());
                call.resolve(result);
            } catch (Exception ex) {
                if (apk != null && apk.exists()) {
                    apk.delete();
                }
                call.reject("Failed to install update APK", "E_INSTALL_UPDATE_APK", ex);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    private File downloadApk(String sourceUrl) throws Exception {
        File dir = new File(getContext().getCacheDir(), "update-apks");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IllegalStateException("Could not create APK cache directory");
        }

        File target = new File(dir, "update.apk");
        File temp = new File(dir, "update.apk.download");
        if (temp.exists()) {
            temp.delete();
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(sourceUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setInstanceFollowRedirects(true);

        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) {
            connection.disconnect();
            throw new IllegalStateException("APK download failed with HTTP " + status);
        }

        long total = connection.getContentLengthLong();
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(temp)) {
            byte[] buffer = new byte[8192];
            int read;
            long transferred = 0;
            long lastNotifyAt = 0;
            notifyDownloadProgress("downloading", transferred, total, "正在下载更新");
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                transferred += read;
                long now = System.currentTimeMillis();
                if (now - lastNotifyAt >= 150 || (total > 0 && transferred >= total)) {
                    notifyDownloadProgress("downloading", transferred, total, "正在下载更新");
                    lastNotifyAt = now;
                }
            }
            notifyDownloadProgress("downloaded", transferred, total > 0 ? total : transferred, "更新包下载完成，正在打开安装界面");
        } finally {
            connection.disconnect();
        }

        if (target.exists()) {
            target.delete();
        }
        if (!temp.renameTo(target)) {
            throw new IllegalStateException("Could not finalize APK download");
        }
        return target;
    }

    private void notifyDownloadProgress(String status, long transferred, long total, String message) {
        double percent = total > 0 ? Math.min(100.0, Math.max(0.0, (transferred * 100.0) / total)) : 0.0;
        JSObject data = new JSObject();
        data.put("status", status);
        data.put("percent", percent);
        data.put("transferred", transferred);
        if (total > 0) {
            data.put("total", total);
        }
        data.put("message", message);
        notifyListeners("downloadProgress", data, true);
    }

    private boolean matchesSha512(File file, String expected) throws Exception {
        byte[] digest = sha512(file);
        String normalized = expected.trim();
        if (normalized.startsWith("sha512-")) {
            normalized = normalized.substring("sha512-".length());
        }

        try {
            byte[] expectedBytes = android.util.Base64.decode(normalized, android.util.Base64.DEFAULT);
            if (Arrays.equals(digest, expectedBytes)) {
                return true;
            }
        } catch (IllegalArgumentException ignored) {}

        return toHex(digest).equals(normalized.replaceAll("\\s+", "").toLowerCase(Locale.US));
    }

    private byte[] sha512(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return digest.digest();
    }

    private String toHex(byte[] bytes) {
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            hex.append(String.format(Locale.US, "%02x", value));
        }
        return hex.toString();
    }

    private void openInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
