# SFM TV labelled side menu — 19 November 2026

## Requested behavior

Replace the upper and lower navigation with a TV side menu inspired by the
owner's reference photos. Every menu icon has a persistent text label. Arabic
opens on the right; English and French follow their reading direction. Sign in
and sign out remain visible in the menu's pinned account section.

The drawer opens initially, closes after a destination is selected, and leaves
the broadcast at its full width. The header contains one labelled Menu handle,
brand identity and Kuwait time. It contains no hidden replacement toolbar.

## Integration

- Build on the illustrated-news and single-page customization candidate from
  PR #373 (`2223e8b06673209258beb3a0a63054ba9de327cf`) and incorporate current
  main `20863a6f71fe9c7c76c307d9aae1696cd9c88750`.
- Keep all nine primary destinations, user channels, customization and settings
  in the drawer. Remaining scenes, market brief/map, playback, refresh,
  fullscreen and welcome replay are labelled in Screen tools. All 25 receiver
  channels remain available through My channels.
- Preserve device pairing for sign in. Sign out confirms revocation of this
  TV's access; it does not sign out other website sessions. Failed revocation
  retains the token, reports an inline error and permits retry. Successful
  revocation clears private state and returns to the public hall.
- Up/Down follows the menu order; Back restores the Menu handle; an inward
  arrow returns to the broadcast. The outer content edge reopens the menu.
  The existing Android Back bridge recognizes the drawer's focus scope.
- Suspend paging while the drawer/dialog is open without rewriting the user's
  playback preference. Preserve browser history for broadcast selections.
- Remove retired navigation CSS. Correct inherited portrait news and compact
  Kuwait card cascade conflicts without changing the performance limits.

## Verification

Local development uses Node 22.13.0 and pnpm 11.1.3. The first local focused
TV unit run passed all 319 cases across 53 files; two additional broadcast
history cases were then added. Translations, maintainability, scoped ESLint
and the standalone packaged build passed. The updated packaged browser suite
collects 167 cases, including the new side-menu, focus and account scenarios.

Local Chromium cannot create its process-singleton socket in this environment;
it aborts before navigation. Browser verification must come from the existing
GitHub Actions gates. No local browser or physical-device pass is claimed.
The candidate remains a draft until exact-head CI, browser layout, production
build/budget and Android packaging checks complete.

Android candidate: version 1.0.23, build 29. No application ID, signing identity,
provider, database migration or authentication authorization policy is changed.
An installed APK needs a new binary to receive this bundled interface; a web
deployment alone does not update it. Store release and physical-device checks
are separate from this candidate.

## Recovery

Revert the reviewed sidebar change to restore the previous navigation, or use
the previous verified application artifact. No data rollback is required.
