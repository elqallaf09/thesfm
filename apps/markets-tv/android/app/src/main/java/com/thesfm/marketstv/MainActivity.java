package com.thesfm.marketstv;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

/** One packaged TV client; no JavaScript/native bridge or account credentials. */
public final class MainActivity extends Activity {
  private WebView screen;
  private static final String APP = "https://appassets.androidplatform.net/assets/index.html";
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    screen = new WebView(this);
    WebSettings settings = screen.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
    screen.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assets.shouldInterceptRequest(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        // Asset/news links are shown as QR codes. Never navigate an untrusted URL.
        return !request.getUrl().toString().equals(APP);
      }
    });
    setContentView(screen);
    screen.setFocusable(true); screen.setFocusableInTouchMode(true); screen.requestFocus();
    screen.loadUrl(APP);
  }
  @Override public boolean dispatchKeyEvent(KeyEvent event) {
    if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
      if (event.getAction() == KeyEvent.ACTION_UP) screen.evaluateJavascript(
        "Boolean(document.querySelector('[data-tv-dialog]'))", result -> {
          if ("true".equals(result)) screen.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))", null);
          else new AlertDialog.Builder(this).setTitle("The SFM Markets TV").setMessage("Exit / خروج / Quitter ?")
            .setPositiveButton(android.R.string.ok, (dialog, which) -> finish())
            .setNegativeButton(android.R.string.cancel, null).show();
        });
      return true;
    }
    return super.dispatchKeyEvent(event);
  }
  @Override protected void onPause() { screen.onPause(); screen.pauseTimers(); super.onPause(); }
  @Override protected void onResume() { super.onResume(); if (screen != null) { screen.onResume(); screen.resumeTimers(); } }
  @Override protected void onDestroy() { screen.destroy(); super.onDestroy(); }
}
