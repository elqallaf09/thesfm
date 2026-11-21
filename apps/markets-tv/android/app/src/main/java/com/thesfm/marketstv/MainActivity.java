package com.thesfm.marketstv;

import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;

/** One packaged TV client; no JavaScript/native bridge or account credentials. */
public final class MainActivity extends ComponentActivity {
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
    // The bundled SFM startup ident plays when the app opens.
    settings.setMediaPlaybackRequiresUserGesture(false);
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
    screen.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assets.shouldInterceptRequest(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        if (ProfileNavigationPolicy.shouldOpenProfile(url, request.isForMainFrame(), request.hasGesture(), request.isRedirect())) {
          openProfileInBrowser();
          return true;
        }
        // The packaged UI stays in the asset origin. Other links remain blocked.
        return !APP.equals(url);
      }
    });
    setContentView(screen);
    WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), screen);
    insets.hide(WindowInsetsCompat.Type.systemBars());
    insets.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    screen.setFocusable(true); screen.setFocusableInTouchMode(true); screen.requestFocus();
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override public void handleOnBackPressed() { handleTvBack(); }
    });
    screen.loadUrl(APP);
  }
  private void openProfileInBrowser() {
    try {
      // No TV pairing token, cookies or headers are transferred to the browser.
      startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(ProfileNavigationPolicy.PROFILE_URL))
        .addCategory(Intent.CATEGORY_BROWSABLE));
    } catch (ActivityNotFoundException | SecurityException error) {
      new AlertDialog.Builder(this).setTitle("حسابي / My account / Mon compte")
        .setMessage("افتح الرابط على هاتفك أو امسح الرمز في شاشة حسابي.\n"
          + "Open this link on your phone, or scan the code on the My account screen.\n"
          + "Ouvrez ce lien sur votre téléphone ou scannez le code sur l’écran Mon compte.\n\n"
          + ProfileNavigationPolicy.PROFILE_URL)
        .setPositiveButton(android.R.string.ok, null).show();
    }
  }
  private void handleTvBack() {
    screen.evaluateJavascript("Boolean(document.querySelector('[data-tv-dialog],[data-tv-focus-scope]'))", result -> {
      if ("true".equals(result)) screen.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))", null);
      else new AlertDialog.Builder(this).setTitle("The SFM Markets TV").setMessage("Exit / خروج / Quitter ?")
        .setPositiveButton(android.R.string.ok, (dialog, which) -> finish())
        .setNegativeButton(android.R.string.cancel, null).show();
    });
  }
  @Override protected void onPause() { screen.onPause(); screen.pauseTimers(); super.onPause(); }
  @Override protected void onResume() { super.onResume(); if (screen != null) { screen.onResume(); screen.resumeTimers(); } }
  @Override protected void onDestroy() { screen.destroy(); super.onDestroy(); }
}
