# Boubyan Capital quarterly Sharia reference

## Product decision

On 4 October 2026 (Asia/Kuwait), the owner selected Boubyan Capital's published
lists as the primary external reference for the Sharia stocks page and asked for
a review every three months. The page attributes the published classification to
Boubyan Capital and identifies its reporting period. A source listing is not an
independent financial-ratio calculation by THE SFM.

The official discovery page is <https://boubyancapital.com/ar/brokerage-ar/>.
Discover future PDF links there; the UUID paths cannot be predicted from a quarter.
The separate US/OTC labels currently link the same US PDF and must not be imported
twice.

## Adopted publication

| Scope | Reporting period | Issue date printed in PDF | Pages | Numbered source rows |
| --- | --- | --- | ---: | ---: |
| Kuwait | Q2 2026 | 2026-07-29 | 5 | 101 |
| GCC | Q2 2026 | 2026-07-29 | 26 | 558 |
| US | Q2 2026 | 2026-08-01 | 78 | 2623 |

The 3282 rows include more than ordinary shares: Kuwait contains a REIT section
and the US document contains funds, preferred shares, trusts and other securities.
The extracted list is therefore a source membership reference, not a current
tradable stock directory. Existing catalog identities and asset types are used
to decide which rows can classify an application security.

Kuwait section counts are 27 Premier, 73 Main and 1 REIT. GCC counts are 355 Saudi,
110 UAE, 40 Oman, 35 Qatar and 18 Bahrain. US exchange counts are 1267 NSDQ, 1208
NYSE and 148 AMEX. Every numbered row was accounted for; the repeated right-hand
row numbers in the Kuwait/GCC PDFs provide a second sequence check.

Source URLs, issue dates, reviewed timestamps and SHA-256 hashes live in
`src/lib/market/boubyanReferenceMetadata.ts`. The compact source snapshot lives in
`src/data/shariah/boubyan-q2-2026.json`. Original PDFs and rendered audit images
are working evidence, not application bundles.

The source was checked at `2026-10-03T21:28:24Z`, which is 4 October in Kuwait.
The next scheduled review is 4 January 2027. Publication issue date, source check
date, reporting quarter and next review date are separate fields. Rechecking a
link never changes the date printed on the original publication.

## Classification and identity rules

- Match the listing venue, exact ticker and company identity. Keep issuer domicile
  separate from listing country. A bare ticker is insufficient.
- Preserve share classes and raw dotted source symbols. Do not strip `.N`, `.PK`
  or other vendor suffixes to force a match.
- A matched, accepted row is labelled as compliant according to Boubyan Capital
  for the published reporting period, with its original PDF page and row.
- A missing source entry is `not_listed`. Absence does not mean noncompliance.
- Unresolved identity, an explicit exit marker, conflicting current evidence or
  an overdue review cannot create a new compliant result.
- Documented manual decisions retain priority. An independent SFM disagreement
  remains visible; SFM ratios are not attributed to Boubyan's publication.
- Missing purification values and financial ratios remain absent, never zero.
- Unknown instrument types, FX, physical metals and crypto spot assets are not
  classified as company shares merely because a similarly named trust appears.
- No per-row ADX/DFM venue is supplied for the UAE section. Keep it unresolved
  unless a separately verified instrument identity resolves that venue.

US source anomalies make identity checks necessary. Page 12 lists `CBM.N` for
Digirad Corp on NSDQ and for AK Steel Holding Corp on NYSE. Page 24 lists `ETG.N`
against Taiwan Semiconductor Manufacturing Co Ltd. These are literal source
pairs and must not be silently corrected to a different application's ticker.
There are 19 duplicate groups in the source, including UAE `GFH` twice and 18 US
tickers repeated under different exchange codes.

## PDF legend

In the adopted Kuwait/GCC PDFs, green means a new entrant and orange means a
company name changed. A black triangle means the company itself operates under
Islamic-law provisions; unmarked entries still belong to the overall list.

The exit/delisting legend swatch in these versions is blank/white. Ordinary white
alternating rows are not exits. Red visible text is branding/headings, not a
negative row flag. No explicit exited body row was identified in this snapshot.
`exitStatus: not_indicated` is not a guarantee of current exchange tradability.

Six green entries were observed: UAE E7 and HH, Oman ABRJ and OQBI, Qatar BLDN,
and Bahrain UGHC. No orange body entry was found. The US document has no
corresponding change-color legend.

## Quarterly review workflow

The owner-authorized recurring review is scheduled for January, April, July and
October on the fourth day, around 08:00 Asia/Kuwait. The first subsequent review
is 4 January 2027. It checks the official page and publishes a concise Arabic
change report after updating verified source data through the repository's
normal workflow. This is a scheduled review; the UI does not claim live PDF
synchronization.

1. Open the official discovery page. Record the actual PDF links and download
   the Kuwait, GCC and US files. Use temporary paths named `kse.pdf`, `gcc.pdf`
   and `usa.pdf` for the extraction command.
2. Inspect the reporting period, visible issue date, board approval, table
   layout and legend. Render samples from each market and every changed marker.
3. Run the reviewed extractor, specifying the real source-check timestamp:

   ```bash
   python3 scripts/shariah/extract-boubyan-reference.py \
     --input-dir /absolute/path/to/review-pdfs \
     --output /absolute/path/to/normalized.json \
     --retrieved-at 2026-10-03T21:28:24Z
   ```

4. The Q2 extractor deliberately rejects an unexpected reporting quarter or row
   count. Review the new edition and update its expected headings/counts before
   importing a new quarter. Never disable validation to accept truncated data.
5. Create a compact candidate with the companion packing script; compare source
   counts, row sequences, symbols, venues, issuer changes and accepted/removed
   memberships against the previous snapshot. Keep old provenance in Git.
6. Run the focused resolver/catalog/route/identity tests and repository gates.
   Update the snapshot, metadata and documentation in one reviewed commit.
7. If no newer publication is linked, state that explicitly and keep its actual
   quarter and issue date. If retrieval or parsing fails, keep the last accepted
   snapshot and expose an overdue/unverified state; do not invent a replacement.

The Python extraction tool requires PyMuPDF (`fitz`) only for the offline source
review. The application reads the compact snapshot on the server and does not
download or parse PDFs during a visitor request.
