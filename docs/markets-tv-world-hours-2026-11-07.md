# World hours and ticker recovery — Huawei build 17

The market-hours view now offers a directory of 81 cash-equity exchanges in
70 countries/territories across seven regions. It is a broad global directory,
not a claim to enumerate every exchange, trading venue or asset-class session.
The requested excluded market is absent from the directory and settings allowlist.

Customers can search exchange names, translated country names and venue codes;
select any subset, all results, all exchanges, or none. Preferences survive
reloads and are retained in paired settings and saved channels. The overview
uses the same selection, with bounded pages rather than a growing sidebar.
The default five followed exchanges remain the initial selection.

Full market hours use readable cards and bounded pages. Local clocks, dated
local trading periods, opening/closing countdowns, and the target Kuwait-time
instant are separate. Split sessions are separate nonbreaking time labels.
Short screens show fewer cards, preserving the text and remote controls.
The picker and source reference pause the panel's one-second clock; quotes
keep their existing slower refresh. The world directory is loaded only when
needed by the website; packaged clients embed it for offline hours.

Regular hours and recorded 2026/2027 holidays use exchange_calendars 4.13.2
cash-equity calendar facts, with linked primary exchange overrides. This
version corrects reference differences for Singapore and Malaysia lunch,
Indonesia and Pakistan Fridays, and updated Muscat, Amman and Nigerian hours.
Colombia uses the New York schedule reference while displaying Colombia's
actual local clock. Every entry includes its reference, also available by QR.
Egypt, Palestine and Iraq use the linked local broker trading guides where
an accessible exchange schedule was unavailable. Known shortened sessions
use the same periods in the labels and the countdown calculation.

References include:

- https://github.com/gerrymanoim/exchange_calendars/tree/v4.13.2/exchange_calendars
- https://www.sgx.com/securities/trading
- https://www.idx.id/en/products-services/trading-hours-and-mechanism/
- https://www.psx.com.pk/psx/exchange/general/trading-hours
- https://www.msx.om/page.aspx?b1=Trading&b2=Trading-Info&mi=3&ti=Trading-Info
- https://ase.com.jo/en/Product-Services/Trading-Services/Trading-Hours
- https://ngxgroup.com/ngx-expands-trading-window-from-900-a-m-to-400-p-m/
- https://tg.efghermes.com/Market/GetById/1103
- https://tjps.ps/
- https://rs.iq/analysis/iraq-stock-exchange/

These are scheduled estimates, not a live exchange-status service. Holiday
coverage varies by reference; Ramadan, summer hours, new holidays and
exceptional closures can require future updates. This limitation appears in
all three languages beside the schedule. No price-provider request is needed
for the clocks or countdowns.

The empty ticker's NaN/NaN came from unsafe pagination arithmetic: an invalid
font/width measurement could poison the column count and the page index.
Measurement now retains the previous valid columns until dimensions are
usable. Both tickers validate every page calculation; an invalid page recovers
to a valid page and automatic playback advances again. Empty selections never
produce division by zero or a nonexistent page number.

Validation covers every directory entry, selection/settings/channel round
trips, known holidays, early closes, Asian lunch and Friday sessions, DST and
Colombia reference/local-zone conversion. Packaged browser checks cover all
81 markets, search, select-all, selection reload/overview, exact countdown
seconds, invalid WebView measurements, layout and remote/source focus in
Arabic, English and French from 540p through 4K.

The Huawei test artifact uses package com.thesfm.marketstv.huaweitest,
versionCode 17 and versionName 1.0.11-huawei-test, signed with the same test
certificate as build 16. Native DEX is unchanged; embedded web assets are
compared with the tested standalone build. This is a test APK, separate from
store publication.
