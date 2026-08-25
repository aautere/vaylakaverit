# Rock Golf source verification

- Change: `openspec/changes/course-selector`
- Status: blocked
- Checked on: 2026-08-25
- Owner: task 1.1

## Official sources

Rock Golf's official length page publishes the tee labels and the length of every hole. Its playing
and overview pages confirm that the course has nine holes, that every hole is par 3, and that all
four tees are handicap-eligible for women and men:

- <https://rockgolf.fi/rockin-vaylapituudet/>
- <https://rockgolf.fi/pelaamaan/>
- <https://rockgolf.fi/yleisesittely/>

Its official slope page embeds and links the public handicap calculator for Rock Golf Finland:

- <https://rockgolf.fi/slope-laskin/>
- <https://hmsclubhouse.azureedge.net/index.html?id=31288>

Rock Golf's official Q&A states that an 18-hole round is booked as two 9-hole rounds:

- <https://rockgolf.fi/q-a/>

This confirms that the intended 18-hole product option is two passes of one nine-hole course. The
published source does not state an effective date or version; this record therefore uses the
retrieval date only.

## Verified hole and tee data

| Hole | Par | R metres | O metres | C metres | K metres |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | 168 | 129 | 122 | 92 |
| 2 | 3 | 169 | 157 | 157 | 96 |
| 3 | 3 | 175 | 163 | 128 | 88 |
| 4 | 3 | 138 | 119 | 112 | 94 |
| 5 | 3 | 123 | 116 | 86 | 81 |
| 6 | 3 | 224 | 218 | 168 | 149 |
| 7 | 3 | 136 | 124 | 111 | 99 |
| 8 | 3 | 179 | 154 | 148 | 125 |
| 9 | 3 | 162 | 134 | 127 | 110 |
| **Total** | **27** | **1474** | **1314** | **1159** | **934** |

The official club pages do not publish a versioned playing-handicap table. Rock Golf's official
slope page links to an interactive calculator that provides the men's Course Rating and Slope
Rating values recorded in `course-data/rock-golf.md`. Its retrievable background tee lengths conflict
with the club's published hole lengths, so the calculator is used only for its rating data pending
Rock Golf's source-version confirmation. The club's published length page remains the source for tee
lengths.

The product owner transcribed the official 18-hole handicap-index sequence from eBirdie, Suomen
Golfliitto's official mobile application, on 2026-08-25. The product owner confirmed that the
official 9-hole sequence is the 18-hole card's first-pass values and that each second-pass index
is its first-pass counterpart plus one. The nine-hole values are normalized to the 1–9 scale with
`(first-pass index + 1) / 2`. The detailed record is in `course-data/rock-golf.md`.

## Blocking data gap

The official eBirdie transcription provides the 18-hole handicap indexes and its first-pass values
for the 9-hole layout. The linked calculator does not provide a club-published, versioned
playing-handicap lookup table or a stated rating effective date.

Do not add Rock Golf to the selectable course registry or enable handicap match play until Rock Golf
provides:

1. confirmation that the Rock Golf published tee lengths and the linked calculator's rating data
   refer to the same current course version, or replacement current rating data;
2. the official men's playing-handicap values or written calculation policy for both offered
   lengths; and
3. the effective date of the rating and playing-handicap data.
