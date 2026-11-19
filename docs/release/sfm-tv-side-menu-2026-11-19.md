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
  main `ff14c1ebc6761ddb890344da62e0371b8e38f307`, including PR #375's
  Forex recovery. Preserve the drawer's pause/focus behavior and readable,
  non-duplicating strips alongside Forex cooldown and retry information.
- Keep all nine primary destinations, user channels, customization and settings
  in the drawer. Remaining scenes, market brief/map, playback, refresh,
  fullscreen and welcome replay are labelled in Screen tools. All 25 receiver
  channels remain available through My channels.
- Preserve device pairing for sign in. Sign out confirms revocation of this
  TV's access; it does not sign out other website sessions. Failed revocation
  retains the token, reports an inline error and permits retry. Successful
  revocation clears private state and returns to the public hall. Completion
  is scoped to the requested account, so an old delayed revocation cannot
  remove a newly paired account. Unmount cancels the pending request.
- Up/Down follows the menu order; Back restores the Menu handle; an inward
  arrow returns to the broadcast. The outer content edge reopens the menu.
  The existing Android Back bridge recognizes the drawer's focus scope.
- Suspend paging while the drawer/dialog is open without rewriting the user's
  playback preference. Preserve browser history for broadcast selections and
  refresh existing packaged deep-link queries without changing the asset path.
- Remove retired navigation CSS. Correct inherited portrait news and compact
  Kuwait card cascade conflicts without changing the performance limits.

## Verification

Local development uses Node 22.13.0 and pnpm 11.1.3. The first local focused
TV unit run passed all 319 cases across 53 files; two additional broadcast
history cases were then added. Translations, maintainability, scoped ESLint
and the standalone packaged build passed.

The first complete candidate, `36efd9403ea3d4c9a76aead666aee287dd300353`,
passed the production build, unchanged route budgets, TypeScript, ESLint,
translations, launch guards and clean migration/access checks in CI run
44515077107. Its unit/integration result was 4530 passed and 23 skipped, with
107 additional engine tests passed. The Vercel preview built successfully.

Packaged CI run 44515076960 passed 163 of 167 cases, including all 13 new
sidebar/layout/remote/account tests. Its real screenshots show the Arabic
drawer and pinned account actions fitting in both themes. The four remaining
findings led to a price-line-height correction, a packaged deep-link fix,
and a genuinely constrained remote-scroll fixture. Follow-up coverage adds
two delayed sign-out/re-pair cases and two deep-link unit cases. The original
assertions for complete prices, evidence and focus remain in place. Current
candidate status and exact-head evidence are recorded in PR #376.

Follow-up candidate `3d6fc249895ef005bd20c229c74f332ad225dd7b` passed all
169 packaged browser cases and Android debug/release/bundle/lint tasks in
run 44519571255. All seven prerequisite required CI checks passed, including
4532 unit/integration cases and 107 engine tests. Its final shared smoke job
started while the Forex update landed on main. The combined candidate must
pass its own required checks before merge; these earlier results are not
substituted for that gate.

Local Chromium cannot create its process-singleton socket in this environment;
it aborts before navigation. Browser verification must come from the existing
GitHub Actions gates. No local browser or physical-device pass is claimed.
The candidate remains a draft until exact-head CI, browser layout, production
build/budget and Android packaging checks complete.

Android combined candidate: version 1.0.24, build 30. The preceding version
1.0.23 / build 29 was delivered as a test APK. The package ID and signing
configuration remain unchanged, but CI debug signatures do not establish
compatibility with the APK currently installed on the owner's device. The
sidebar adds no provider, database migration or authentication policy change.
An installed APK needs a new binary to receive this bundled interface; a web
deployment alone does not update it. Store release and physical-device checks
are separate from this candidate.

## Recovery

Revert the reviewed sidebar change to restore the previous navigation, or use
the previous verified application artifact. No data rollback is required.
