package cn.local.quicktranslate;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.ContentObserver;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;
import java.util.Arrays;

public class MobileFloatingTranslateAccessibilityService extends AccessibilityService {
    private static final String ACTION_VOLUME_CHANGED = "android.media.VOLUME_CHANGED_ACTION";
    private static final String EXTRA_VOLUME_VALUE = "android.media.EXTRA_VOLUME_STREAM_VALUE";
    private static final String EXTRA_PREV_VOLUME_VALUE = "android.media.EXTRA_PREV_VOLUME_STREAM_VALUE";
    private static final long VOLUME_TRIGGER_DEBOUNCE_MS = 650;
    private static final int[] OBSERVED_VOLUME_STREAMS = new int[] {
        AudioManager.STREAM_MUSIC,
        AudioManager.STREAM_RING,
        AudioManager.STREAM_NOTIFICATION,
        AudioManager.STREAM_SYSTEM,
        AudioManager.STREAM_ALARM
    };
    private static final String[] OBSERVED_VOLUME_SETTINGS = new String[] {
        "volume_music",
        "volume_music_speaker",
        "volume_ring",
        "volume_ring_speaker",
        "volume_notification",
        "volume_notification_speaker",
        "volume_system",
        "volume_voice",
        "volume_voice_speaker",
        "volume_alarm",
        "volume_alarm_speaker"
    };

    private long lastVolumeShortcutAt = 0;
    private BroadcastReceiver volumeReceiver;
    private ContentObserver volumeObserver;
    private int[] lastObservedVolumes;

    @Override
    protected void onServiceConnected() {
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
                | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            setServiceInfo(info);
        }
        registerVolumeShortcutReceiver();
        registerVolumeSettingsObserver();
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

        MobileFloatingTranslateOverlay.get(this).showFromSelectionOrClipboard("全局按键触发", getRootInActiveWindow());
        return true;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {}

    @Override
    public boolean onUnbind(Intent intent) {
        unregisterVolumeShortcutReceiver();
        unregisterVolumeSettingsObserver();
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        unregisterVolumeShortcutReceiver();
        unregisterVolumeSettingsObserver();
        super.onDestroy();
    }

    private void registerVolumeShortcutReceiver() {
        if (volumeReceiver != null) {
            return;
        }

        volumeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || !ACTION_VOLUME_CHANGED.equals(intent.getAction())) {
                    return;
                }

                handleVolumeChanged(intent);
            }
        };

        IntentFilter filter = new IntentFilter(ACTION_VOLUME_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(volumeReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(volumeReceiver, filter);
        }
    }

    private void unregisterVolumeShortcutReceiver() {
        if (volumeReceiver == null) {
            return;
        }

        try {
            unregisterReceiver(volumeReceiver);
        } catch (IllegalArgumentException ignored) {}
        volumeReceiver = null;
    }

    private void registerVolumeSettingsObserver() {
        if (volumeObserver != null) {
            return;
        }

        lastObservedVolumes = readObservedVolumes();
        volumeObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override
            public void onChange(boolean selfChange) {
                handleObservedVolumeChange();
            }
        };
        getContentResolver().registerContentObserver(
            android.provider.Settings.System.CONTENT_URI,
            true,
            volumeObserver
        );
    }

    private void unregisterVolumeSettingsObserver() {
        if (volumeObserver == null) {
            return;
        }

        getContentResolver().unregisterContentObserver(volumeObserver);
        volumeObserver = null;
        lastObservedVolumes = null;
    }

    private void handleObservedVolumeChange() {
        int shortcutKeyCode = MobileFloatingTranslateSettings.getShortcutKeyCode(this);
        if (shortcutKeyCode != KeyEvent.KEYCODE_VOLUME_DOWN && shortcutKeyCode != KeyEvent.KEYCODE_VOLUME_UP) {
            lastObservedVolumes = readObservedVolumes();
            return;
        }

        int[] currentVolumes = readObservedVolumes();
        int[] previousVolumes = lastObservedVolumes;
        lastObservedVolumes = currentVolumes;
        if (previousVolumes == null || previousVolumes.length != currentVolumes.length) {
            return;
        }

        boolean matched = false;
        for (int index = 0; index < currentVolumes.length; index += 1) {
            if (currentVolumes[index] < 0 || previousVolumes[index] < 0) {
                continue;
            }
            if (shortcutKeyCode == KeyEvent.KEYCODE_VOLUME_DOWN && currentVolumes[index] < previousVolumes[index]) {
                matched = true;
                break;
            }
            if (shortcutKeyCode == KeyEvent.KEYCODE_VOLUME_UP && currentVolumes[index] > previousVolumes[index]) {
                matched = true;
                break;
            }
        }

        if (matched) {
            triggerVolumeShortcut("音量键触发");
        }
    }

    private int[] readObservedVolumes() {
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        int[] volumes = new int[OBSERVED_VOLUME_STREAMS.length + OBSERVED_VOLUME_SETTINGS.length];
        if (audioManager == null) {
            Arrays.fill(volumes, -1);
            return volumes;
        }

        for (int index = 0; index < OBSERVED_VOLUME_STREAMS.length; index += 1) {
            try {
                volumes[index] = audioManager.getStreamVolume(OBSERVED_VOLUME_STREAMS[index]);
            } catch (RuntimeException ignored) {
                volumes[index] = -1;
            }
        }
        for (int index = 0; index < OBSERVED_VOLUME_SETTINGS.length; index += 1) {
            volumes[OBSERVED_VOLUME_STREAMS.length + index] = android.provider.Settings.System.getInt(
                getContentResolver(),
                OBSERVED_VOLUME_SETTINGS[index],
                -1
            );
        }
        return volumes;
    }

    private void handleVolumeChanged(Intent intent) {
        if (!MobileFloatingTranslateSettings.isEnabled(this)) {
            return;
        }

        int shortcutKeyCode = MobileFloatingTranslateSettings.getShortcutKeyCode(this);
        if (shortcutKeyCode != KeyEvent.KEYCODE_VOLUME_DOWN && shortcutKeyCode != KeyEvent.KEYCODE_VOLUME_UP) {
            return;
        }

        int currentVolume = intent.getIntExtra(EXTRA_VOLUME_VALUE, -1);
        int previousVolume = intent.getIntExtra(EXTRA_PREV_VOLUME_VALUE, -1);
        if (currentVolume < 0 || previousVolume < 0 || currentVolume == previousVolume) {
            return;
        }

        boolean matched = shortcutKeyCode == KeyEvent.KEYCODE_VOLUME_DOWN
            ? currentVolume < previousVolume
            : currentVolume > previousVolume;
        if (!matched) {
            return;
        }

        triggerVolumeShortcut("音量键触发");
    }

    private void triggerVolumeShortcut(String triggerSource) {
        if (!MobileFloatingTranslateSettings.isEnabled(this)) {
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastVolumeShortcutAt < VOLUME_TRIGGER_DEBOUNCE_MS) {
            return;
        }
        lastVolumeShortcutAt = now;

        MobileFloatingTranslateOverlay.get(this).showFromSelectionOrClipboard(triggerSource, getRootInActiveWindow());
    }
}
