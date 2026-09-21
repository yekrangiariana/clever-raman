package com.example.navios;

import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private AudioFocusRequest audioFocusRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FoldablePlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception e) {
            // bridge not yet attached
        }

        // Pre-warm Android AudioManager focus so Chromium's WebMediaPlayerImpl
        // gets instant audio focus when the user taps a track, instead of waiting
        // 1-5 seconds for the OS to negotiate focus away from other apps.
        prewarmAudioFocus();
    }

    private void prewarmAudioFocus() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager == null) return;

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(focusChange -> {
                    // Focus change is handled by the WebView's internal Chromium media pipeline
                })
                .build();

            audioManager.requestAudioFocus(audioFocusRequest);
        } catch (Exception e) {
            // Non-fatal: audio will still work, just without the pre-warm benefit
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Release audio focus when app is destroyed
        try {
            AudioManager audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (audioManager != null && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
