# Markets TV countdown and unavailable-data repair

Closed markets now show an explicit days/hours/minutes/seconds countdown and
the next scheduled opening in Kuwait time. At the opening instant the counter
switches to the scheduled close. The sessions panel owns its one-second timer,
rebases on visibility changes, and reuses time-zone formatters; quote tables
retain their existing slower refresh schedule. Weekends explicitly say there
is no session today rather than showing an unexplained blank timeline.

If current session changes cannot be compared, the brief lists the saved
prices with their original timestamps and sources. It does not rank stale
observations or turn absent changes into zeroes. The change map includes the
actual quote and unit; when no verified map is possible it displays the quote
rows with an explanation instead of an empty panel.

When a Gulf or European directory is unavailable, the catalog can use the
existing qualified configured listings. These are labelled selected coverage,
not a complete exchange directory. Real directories remain preferred and
unknown exchanges retain their error state. Commodity strips use the same four
explicit continuous contracts and verified fallback as the viewing scene;
spot metal and dated contracts are not substituted. Zero-directory strips use
a compact error row without a fictitious page count.

Regular hours were rechecked on 2026-11-07 against the official exchange pages:

- [Boursa Kuwait](https://www.boursakuwait.com.kw/en/securities/trading/trading-information/)
- [Saudi Exchange](https://www.saudiexchange.sa/wps/portal/saudiexchange/rules-guidance/capital-market-overview/trading-cycle-and-times)
- [London Stock Exchange](https://www.londonstockexchange.com/en/resources/faqs/personal-investing)
- [NYSE](https://www.nyse.com/trade/hours-calendars)
- [Japan Exchange Group](https://www.jpx.co.jp/english/equities/trading/domestic/01.html)

The countdown is a scheduled estimate, not a live exchange-status feed. Existing
published holiday and early-close exceptions are retained. Exceptional Gulf
closures still depend on subsequent official announcements.

Validation includes deterministic weekend/opening/Tokyo-lunch/DST cases,
directory failure recovery, saved-price presentation, and packaged browser
tests for Arabic, English and French from 540p through 4K. The Huawei test APK
uses build 16 / 1.0.10 with the existing test package and signing certificate;
its native DEX files are unchanged and its embedded web assets are compared
byte-for-byte with the tested build. This test APK is separate from store
distribution and its permanent signing requirements.
