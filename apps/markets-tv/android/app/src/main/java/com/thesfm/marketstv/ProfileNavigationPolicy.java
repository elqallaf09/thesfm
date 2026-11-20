package com.thesfm.marketstv;

/** A profile edit opens a separate browser session, never the TV WebView. */
final class ProfileNavigationPolicy {
  static final String PROFILE_URL = "https://www.the-sfm.com/profile";

  private ProfileNavigationPolicy() {}

  static boolean shouldOpenProfile(String url, boolean mainFrame, boolean userGesture, boolean redirect) {
    // Exact matching also rejects query strings, fragments, credentials and ports.
    return mainFrame && userGesture && !redirect && PROFILE_URL.equals(url);
  }
}
