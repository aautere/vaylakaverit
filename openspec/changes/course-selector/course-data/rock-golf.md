# Course-data verification: Rock Golf

- Change: `openspec/changes/course-selector`
- Task: 1.1
- Status: verified
- Retrieved on: 2026-08-26

## Sources

| Source                       | Publisher         | URL                                       | Retrieved on | Effective date/version  | Data supplied                                                                                                                                                                           |
| ---------------------------- | ----------------- | ----------------------------------------- | ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rockin väylien pituudet      | Rock Golf         | https://rockgolf.fi/rockin-vaylapituudet/ | 2026-08-25   | Not stated              | Comparison only; not the selected initial configuration source.                                                                                                                         |
| Q&A                          | Rock Golf         | https://rockgolf.fi/q-a/                  | 2026-08-25   | Not stated              | An 18-hole round is two booked nine-hole rounds.                                                                                                                                        |
| eBirdie mobile application   | Suomen Golfliitto | https://golf.fi/pelaajalle/ebirdie/       | 2026-08-25   | Not stated              | Official 18-hole scorecard handicap indexes, transcribed by the product owner; its first pass is the confirmed 9-hole sequence and each second-pass index is first-pass index plus one. |
| Rock-linked slope calculator | Rock Golf / HMS   | https://rockgolf.fi/slope-laskin/         | 2026-08-26   | Retrieved snapshot date | Selected initial source for men's tee lengths, Course Rating, and Slope Rating.                                                                                                         |

## Layouts and tees

| Layout   | Holes | Total par | Tee | Total metres | Men CR / slope | Women CR / slope        | Source                        |
| -------- | ----: | --------: | --- | -----------: | -------------- | ----------------------- | ----------------------------- |
| 9 holes  |     9 |        27 | R   |         1438 | 28.6 / 102     | Not supported initially | Linked calculator             |
| 9 holes  |     9 |        27 | O   |         1297 | 28.1 / 100     | Not supported initially | Linked calculator             |
| 9 holes  |     9 |        27 | C   |         1159 | 27.5 / 98      | Not supported initially | Rock Golf / linked calculator |
| 9 holes  |     9 |        27 | K   |          934 | 26.6 / 95      | Not supported initially | Rock Golf / linked calculator |
| 18 holes |    18 |        54 | R   |         2876 | 57.2 / 102     | Not supported initially | Linked calculator             |
| 18 holes |    18 |        54 | O   |         2594 | 56.2 / 100     | Not supported initially | Linked calculator             |
| 18 holes |    18 |        54 | C   |         2318 | 55.0 / 98      | Not supported initially | Linked calculator             |
| 18 holes |    18 |        54 | K   |         1868 | 53.2 / 95      | Not supported initially | Linked calculator             |

The selected calculator reports 9-hole total lengths R 1438, O 1297, C 1159, and K 934 and
corresponding 18-hole totals R 2876, O 2594, C 2318, and K 1868. Its values form the initial
versioned course-data snapshot. Tee O is the product default for both layouts.

## Hole data

| Layout   | Round hole | Source hole | Pass | Par | Handicap index | Tee lengths in metres      | Source                      |
| -------- | ---------: | ----------: | ---: | --: | -------------: | -------------------------- | --------------------------- |
| 9 holes  |          1 |           1 |    1 |   3 |              3 | R 151, O 129, C 122, K 92  | Linked calculator / eBirdie |
| 9 holes  |          2 |           2 |    1 |   3 |              6 | R 169, O 157, C 157, K 96  | Linked calculator / eBirdie |
| 9 holes  |          3 |           3 |    1 |   3 |              4 | R 175, O 163, C 128, K 88  | Linked calculator / eBirdie |
| 9 holes  |          4 |           4 |    1 |   3 |              8 | R 138, O 119, C 112, K 94  | Linked calculator / eBirdie |
| 9 holes  |          5 |           5 |    1 |   3 |              9 | R 123, O 116, C 86, K 81   | Linked calculator / eBirdie |
| 9 holes  |          6 |           6 |    1 |   3 |              1 | R 205, O 201, C 168, K 149 | Linked calculator / eBirdie |
| 9 holes  |          7 |           7 |    1 |   3 |              7 | R 136, O 124, C 111, K 99  | Linked calculator / eBirdie |
| 9 holes  |          8 |           8 |    1 |   3 |              2 | R 179, O 154, C 148, K 125 | Linked calculator / eBirdie |
| 9 holes  |          9 |           9 |    1 |   3 |              5 | R 162, O 134, C 127, K 110 | Linked calculator / eBirdie |
| 18 holes |          1 |           1 |    1 |   3 |              5 | R 151, O 129, C 122, K 92  | Linked calculator / eBirdie |
| 18 holes |          2 |           2 |    1 |   3 |             11 | R 169, O 157, C 157, K 96  | Linked calculator / eBirdie |
| 18 holes |          3 |           3 |    1 |   3 |              7 | R 175, O 163, C 128, K 88  | Linked calculator / eBirdie |
| 18 holes |          4 |           4 |    1 |   3 |             15 | R 138, O 119, C 112, K 94  | Linked calculator / eBirdie |
| 18 holes |          5 |           5 |    1 |   3 |             17 | R 123, O 116, C 86, K 81   | Linked calculator / eBirdie |
| 18 holes |          6 |           6 |    1 |   3 |              1 | R 205, O 201, C 168, K 149 | Linked calculator / eBirdie |
| 18 holes |          7 |           7 |    1 |   3 |             13 | R 136, O 124, C 111, K 99  | Linked calculator / eBirdie |
| 18 holes |          8 |           8 |    1 |   3 |              3 | R 179, O 154, C 148, K 125 | Linked calculator / eBirdie |
| 18 holes |          9 |           9 |    1 |   3 |              9 | R 162, O 134, C 127, K 110 | Linked calculator / eBirdie |
| 18 holes |         10 |           1 |    2 |   3 |              6 | R 151, O 129, C 122, K 92  | Linked calculator / eBirdie |
| 18 holes |         11 |           2 |    2 |   3 |             12 | R 169, O 157, C 157, K 96  | Linked calculator / eBirdie |
| 18 holes |         12 |           3 |    2 |   3 |              8 | R 175, O 163, C 128, K 88  | Linked calculator / eBirdie |
| 18 holes |         13 |           4 |    2 |   3 |             16 | R 138, O 119, C 112, K 94  | Linked calculator / eBirdie |
| 18 holes |         14 |           5 |    2 |   3 |             18 | R 123, O 116, C 86, K 81   | Linked calculator / eBirdie |
| 18 holes |         15 |           6 |    2 |   3 |              2 | R 205, O 201, C 168, K 149 | Linked calculator / eBirdie |
| 18 holes |         16 |           7 |    2 |   3 |             14 | R 136, O 124, C 111, K 99  | Linked calculator / eBirdie |
| 18 holes |         17 |           8 |    2 |   3 |              4 | R 179, O 154, C 148, K 125 | Linked calculator / eBirdie |
| 18 holes |         18 |           9 |    2 |   3 |             10 | R 162, O 134, C 127, K 110 | Linked calculator / eBirdie |

The product owner confirmed that the official 9-hole scorecard normalizes the eBirdie 18-hole
card's first-pass indexes to 1–9 with `(first-pass index + 1) / 2`. Its sequence is 3, 6, 4, 8, 9,
1, 7, 2, and 5. For every source hole, the 18-hole second-pass index is the corresponding
first-pass index plus one: 5/6, 11/12, 7/8, 15/16, 17/18, 1/2, 13/14, 3/4, and 9/10.

## Playing-handicap data

The selected calculator's live setting is `handicap_calculation_version: "2020"`. It uses the
following men's policy:

- **18 holes:** `round(HI × slope / 113 + (CR - 54))`.
- **9 holes:** first calculate `HIused = roundToOneDecimal(HI / 2)`, then
  `round(HIused × slope / 113 + (CR - 27))`.
- Intermediate and final rounding use JavaScript `Math.round`, including its positive-infinity
  handling for exact `.5` ties. Rock has no enabled handicap multiplier.

The women's table is intentionally not supported in Rock Golf's initial product configuration.

## Data checks

- Total par: 9 holes are nine par-3 holes (27); the confirmed two-pass 18-hole layout totals 54.
- Tee-distance totals: recorded 9-hole totals equal the sum of the official per-hole lengths.
- Handicap-index ordering and completeness: the eBirdie 18-hole transcription contains every index
  from 1 through 18 exactly once. The 9-hole layout normalizes first-pass values to every index
  from 1 through 9 exactly once; every 18-hole second-pass value is its matching first-pass value
  plus one.
- Layout mapping: Rock Golf confirms that 18 holes are played as two nine-hole rounds.
- Historical versioning/effective date: the selected calculator snapshot is versioned by retrieval
  date 2026-08-26.

## Blockers and handoff

None. The selected calculator snapshot contains the data required for the initial men's-only Rock
Golf configuration. Future source updates create a new course-data version.
