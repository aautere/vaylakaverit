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

The official club pages do not publish the required hole-handicap indexes, men's or women's course
ratings, slope ratings, or a versioned playing-handicap table. Rock Golf's official slope page
links to an interactive calculator, but the calculator is not a published rating table and its
retrievable background values conflict with the club's published hole lengths. The club's published
length page is therefore the only recorded source for tee lengths; calculator background data is
not adopted.

The product owner transcribed the official 18-hole handicap-index sequence from eBirdie, Suomen
Golfliitto's official mobile application, on 2026-08-25. The product owner confirmed that the
official 9-hole sequence is the 18-hole card's first-pass values and that each second-pass index
is its first-pass counterpart plus one. The detailed record is in `course-data/rock-golf.md`.

## Blocking data gap

The official eBirdie transcription provides the 18-hole handicap indexes and its first-pass values
for the 9-hole layout. The calculator does not provide a club-published, versioned
playing-handicap lookup table or a stated effective date for its values.

Do not add Rock Golf to the selectable course registry or enable handicap match play until Rock Golf
provides:

1. the official men's and women's Course Rating and Slope Rating values for each tee and offered
   length;
2. the official playing-handicap values or written calculation policy for both offered lengths and
   rating tables; and
3. the effective date of those values.
