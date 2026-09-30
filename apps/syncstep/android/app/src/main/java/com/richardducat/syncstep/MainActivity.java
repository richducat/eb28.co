package com.richardducat.syncstep;

import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Native Mobile Wallet Adapter bridge; must be registered before the bridge starts.
        registerPlugin(MobileWalletAdapterPlugin.class);
        super.onCreate(savedInstanceState);
        installBackHandler();
    }

    private WebView web() {
        return getBridge() != null ? getBridge().getWebView() : null;
    }

    private void dispatchWindowEvent(final String name) {
        final WebView webView = web();
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new Event('" + name + "'));", null));
    }

    private void installBackHandler() {
        final WebView webView = web();
        if (webView == null) return;
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                final OnBackPressedCallback self = this;
                webView.evaluateJavascript(
                    "(function(){try{return !!(window.__syncstepHandleBack && window.__syncstepHandleBack())}catch(e){return false}})()",
                    (ValueCallback<String>) value -> {
                        if ("true".equals(value)) return;
                        self.setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        self.setEnabled(true);
                    }
                );
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        dispatchWindowEvent("blur");
    }

    @Override
    public void onResume() {
        super.onResume();
        dispatchWindowEvent("focus");
    }
}
