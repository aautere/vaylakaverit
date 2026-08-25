# Course-data verification: Rock Golf

- Change: `openspec/changes/course-selector`
- Task: 1.1
- Status: blocked
- Retrieved on: 2026-08-25

## Sources

| Source | Publisher | URL | Retrieved on | Effective date/version | Data supplied |
| --- | --- | --- | --- | --- | --- |
| Rockin väylien pituudet | Rock Golf | https://rockgolf.fi/rockin-vaylapituudet/ | 2026-08-25 | Not stated | Nine-hole tee labels, per-hole lengths, and all-par-3 course description. |
| Q&A | Rock Golf | https://rockgolf.fi/q-a/ | 2026-08-25 | Not stated | An 18-hole round is two booked nine-hole rounds. |
| eBirdie mobile application | Suomen Golfliitto | https://golf.fi/pelaajalle/ebirdie/ | 2026-08-25 | Not stated | Official 18-hole scorecard handicap indexes, transcribed by the product owner. |

## Layouts and tees

| Layout | Holes | Total par | Tee | Total metres | Men CR / slope | Women CR / slope | Source |
| --- | ---: | ---: | --- | ---: | --- | --- | --- |
| 9 holes | 9 | 27 | R | 1474 | Missing | Missing | Rockin väylien pituudet |
| 9 holes | 9 | 27 | O | 1314 | Missing | Missing | Rockin väylien pituudet |
| 9 holes | 9 | 27 | C | 1159 | Missing | Missing | Rockin väylien pituudet |
| 9 holes | 9 | 27 | K | 934 | Missing | Missing | Rockin väylien pituudet |
| 18 holes | 18 | 54 | R, O, C, K | Two 9-hole passes | Missing | Missing | Rock Golf Q&A |

## Hole data

| Layout | Round hole | Source hole | Pass | Par | Handicap index | Tee lengths in metres | Source |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 18 holes | 1 | 1 | 1 | 3 | 5 | R 168, O 129, C 122, K 92 | Rock Golf / eBirdie |
| 18 holes | 2 | 2 | 1 | 3 | 11 | R 169, O 157, C 157, K 96 | Rock Golf / eBirdie |
| 18 holes | 3 | 3 | 1 | 3 | 7 | R 175, O 163, C 128, K 88 | Rock Golf / eBirdie |
| 18 holes | 4 | 4 | 1 | 3 | 15 | R 138, O 119, C 112, K 94 | Rock Golf / eBirdie |
| 18 holes | 5 | 5 | 1 | 3 | 17 | R 123, O 116, C 86, K 81 | Rock Golf / eBirdie |
| 18 holes | 6 | 6 | 1 | 3 | 1 | R 224, O 218, C 168, K 149 | Rock Golf / eBirdie |
| 18 holes | 7 | 7 | 1 | 3 | 13 | R 136, O 124, C 111, K 99 | Rock Golf / eBirdie |
| 18 holes | 8 | 8 | 1 | 3 | 3 | R 179, O 154, C 148, K 125 | Rock Golf / eBirdie |
| 18 holes | 9 | 9 | 1 | 3 | 9 | R 162, O 134, C 127, K 110 | Rock Golf / eBirdie |
| 18 holes | 10 | 1 | 2 | 3 | 6 | R 168, O 129, C 122, K 92 | Rock Golf / eBirdie |
| 18 holes | 11 | 2 | 2 | 3 | 12 | R 169, O 157, C 157, K 96 | Rock Golf / eBirdie |
| 18 holes | 12 | 3 | 2 | 3 | 8 | R 175, O 163, C 128, K 88 | Rock Golf / eBirdie |
| 18 holes | 13 | 4 | 2 | 3 | 16 | R 138, O 119, C 112, K 94 | Rock Golf / eBirdie |
| 18 holes | 14 | 5 | 2 | 3 | 18 | R 123, O 116, C 86, K 81 | Rock Golf / eBirdie |
| 18 holes | 15 | 6 | 2 | 3 | 2 | R 224, O 218, C 168, K 149 | Rock Golf / eBirdie |
| 18 holes | 16 | 7 | 2 | 3 | 14 | R 136, O 124, C 111, K 99 | Rock Golf / eBirdie |
| 18 holes | 17 | 8 | 2 | 3 | 4 | R 179, O 154, C 148, K 125 | Rock Golf / eBirdie |
| 18 holes | 18 | 9 | 2 | 3 | 10 | R 162, O 134, C 127, K 110 | Rock Golf / eBirdie |

The official 9-hole scorecard handicap indexes have not been supplied. They cannot be inferred
from the 18-hole card because the second pass uses different handicap indexes.

## Playing-handicap data

No official playing-handicap lookup table or written calculation policy has been retrieved. Course
Rating and Slope Rating values are also missing for both rating tables and both offered lengths.

## Data checks

- Total par: 9 holes are nine par-3 holes (27); the confirmed two-pass 18-hole layout totals 54.
- Tee-distance totals: recorded 9-hole totals equal the sum of the official per-hole lengths.
- Handicap-index ordering and completeness: the eBirdie 18-hole transcription contains every index
  from 1 through 18 exactly once. The 9-hole layout remains missing.
- Layout mapping: Rock Golf confirms that 18 holes are played as two nine-hole rounds.
- Historical versioning/effective date: missing from all retrieved sources.

## Blockers and handoff

Rock Golf cannot yet be configured or shown in the course selector. Rock Golf or Suomen Golfliitto
must provide the official 9-hole handicap indexes, men's and women's Course Rating and Slope Rating
tables for both lengths, the playing-handicap policy or lookup values, and their effective date.
