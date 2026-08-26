# Rock Golf source verification

- Change: `openspec/changes/course-selector`
- Status: verified
- Checked on: 2026-08-26
- Owner: task 1.1

## Official sources

Rock Golf's official length page is retained as a comparison source. Its playing and overview pages
confirm that the course has nine holes, that every hole is par 3, and that all four tees are
handicap-eligible for women and men:

- <https://rockgolf.fi/rockin-vaylapituudet/>
- <https://rockgolf.fi/pelaamaan/>
- <https://rockgolf.fi/yleisesittely/>

Its official slope page embeds and links the public handicap calculator for Rock Golf Finland:

- <https://rockgolf.fi/slope-laskin/>
- <https://hmsclubhouse.azureedge.net/index.html?id=31288>

Rock Golf's official Q&A states that an 18-hole round is booked as two 9-hole rounds:

- <https://rockgolf.fi/q-a/>

This confirms that the intended 18-hole product option is two passes of one nine-hole course. The
selected calculator source does not state an effective date or version; this record therefore uses
its retrieval date as the initial course-data snapshot version.

## Verified hole and tee data

| Hole      |    Par | R metres | O metres | C metres | K metres |
| --------- | -----: | -------: | -------: | -------: | -------: |
| 1         |      3 |      151 |      129 |      122 |       92 |
| 2         |      3 |      169 |      157 |      157 |       96 |
| 3         |      3 |      175 |      163 |      128 |       88 |
| 4         |      3 |      138 |      119 |      112 |       94 |
| 5         |      3 |      123 |      116 |       86 |       81 |
| 6         |      3 |      205 |      201 |      168 |      149 |
| 7         |      3 |      136 |      124 |      111 |       99 |
| 8         |      3 |      179 |      154 |      148 |      125 |
| 9         |      3 |      162 |      134 |      127 |      110 |
| **Total** | **27** | **1438** | **1297** | **1159** |  **934** |

The official club pages do not publish a versioned playing-handicap table. Rock Golf's official
slope page links to an interactive calculator that provides the men's Course Rating, Slope Rating,
and tee lengths recorded in `course-data/rock-golf.md`. The product owner selected that official
calculator as the initial course-data source. The club's published length page remains a comparison
source, not the selected configuration source.

The product owner transcribed the official 18-hole handicap-index sequence from eBirdie, Suomen
Golfliitto's official mobile application, on 2026-08-25. The product owner confirmed that the
official 9-hole sequence is the 18-hole card's first-pass values and that each second-pass index
is its first-pass counterpart plus one. The nine-hole values are normalized to the 1–9 scale with
`(first-pass index + 1) / 2`. The detailed record is in `course-data/rock-golf.md`.

## Verified playing-handicap policy

The official eBirdie transcription provides the 18-hole handicap indexes and its first-pass values
for the 9-hole layout. The selected calculator's live `2020` policy uses the full Handicap Index
for 18 holes and a one-decimal rounded half index for 9 holes before applying the men's
Course Rating and Slope Rating calculation.

The selected calculator source is sufficient for the initial men's-only Rock Golf configuration.
Tee O is the product default for both layouts. A future source update creates a new version rather
than changing historical rounds.
