package com.thesfm.marketstv;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class ProfileNavigationPolicyTest {
  @Test public void opensTheExactProfileForADirectUserNavigation() {
    assertTrue(ProfileNavigationPolicy.shouldOpenProfile("https://www.the-sfm.com/profile", true, true, false));
  }

  @Test public void rejectsUrlsOutsideTheExactCredentialFreeDestination() {
    String[] blocked = {
      null, "", "http://www.the-sfm.com/profile", "https://the-sfm.com/profile",
      "https://www.the-sfm.com.evil.example/profile", "https://www.the-sfm.com@evil.example/profile",
      "https://user:password@www.the-sfm.com/profile", "https://www.the-sfm.com:443/profile",
      "https://www.the-sfm.com:8443/profile", "https://www.the-sfm.com/profile/",
      "https://www.the-sfm.com/profile?token=secret", "https://www.the-sfm.com/profile?",
      "https://www.the-sfm.com/profile#secret", "https://www.the-sfm.com/profile#",
      "https://www.the-sfm.com/%70rofile", "https://www.the-sfm.com/other/../profile",
      "https://www.the-sfm.com/profile/../admin", "https://www.the-sfm.com/PROFILE",
      "https://www.the-sfm.com/login", "https://www.the-sfm.com/profile\n",
      "https://www.the-sfm.com\\@evil.example/profile", "//www.the-sfm.com/profile",
      "javascript:location.href='https://www.the-sfm.com/profile'",
      "intent://www.the-sfm.com/profile", "file:///profile",
      "https://appassets.androidplatform.net/assets/index.html"
    };
    for (String url : blocked) assertFalse(String.valueOf(url), ProfileNavigationPolicy.shouldOpenProfile(url, true, true, false));
  }

  @Test public void rejectsSubframeNavigations() {
    assertFalse(ProfileNavigationPolicy.shouldOpenProfile(ProfileNavigationPolicy.PROFILE_URL, false, true, false));
  }

  @Test public void rejectsProgrammaticNavigationsWithoutAUserGesture() {
    assertFalse(ProfileNavigationPolicy.shouldOpenProfile(ProfileNavigationPolicy.PROFILE_URL, true, false, false));
  }

  @Test public void rejectsRedirectsEvenWithAUserGesture() {
    assertFalse(ProfileNavigationPolicy.shouldOpenProfile(ProfileNavigationPolicy.PROFILE_URL, true, true, true));
  }
}
