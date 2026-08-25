# Rock Golf source verification

- Change: `openspec/changes/course-selector`
- Status: blocked
- Checked on: 2026-08-25
- Owner: task 1.1

## Official sources

Rock Golf's official playing page confirms that the course has nine holes, is a par-3 course, and
has four handicap-eligible tees:

- <https://rockgolf.fi/pelaamaan/>
- <https://rockgolf.fi/vaylaesittely/>

Its official slope page embeds and links the public handicap calculator for Rock Golf Finland:

- <https://rockgolf.fi/slope-laskin/>
- <https://hmsclubhouse.azureedge.net/index.html?id=31288>

The linked calculator's public current-data endpoint returns the following two course layouts for
Rock Golf Finland (`id` 31288):

| Layout | Holes | Par | Tee labels | Default provider tees |
| --- | ---: | ---: | --- | --- |
| 9 holes | 9 | 27 | R, O, C, K | O / K |
| 18 holes | 18 | 54 | R, O, C, K | O / K |

The 18-hole layout repeats the same nine source-hole distances for holes 10 through 18. This
confirms that the intended 18-hole product option is two passes of one nine-hole course.

## Available official tee data

| Tee | 9-hole metres | 9-hole men CR / slope | 9-hole women CR / slope | 18-hole metres | 18-hole men CR / slope | 18-hole women CR / slope |
| --- | ---: | --- | --- | ---: | --- | --- |
| R | 1438 | 28.6 / 102 | 29.5 / 102 | 2876 | 57.2 / 102 | 59.0 / 102 |
| O | 1297 | 28.1 / 100 | 29.0 / 100 | 2594 | 56.2 / 100 | 58.0 / 100 |
| C | 1159 | 27.5 / 98 | 28.5 / 98 | 2318 | 55.0 / 98 | 57.0 / 98 |
| K | 934 | 26.6 / 95 | 27.7 / 95 | 1868 | 53.2 / 95 | 55.4 / 95 |

## Blocking data gap

The linked calculator returns `null` for all hole-handicap indexes and for all per-hole par values.
The site describes Rock Golf as a nine-hole par-3 course and the calculator publishes total par 27,
but neither source provides the official ordered handicap indexes required to allocate
match-play handicap strokes.

The calculator also presents computed course handicaps rather than a published, versioned
playing-handicap lookup table. The approved product rules require an official source or written
Rock Golf confirmation for that lookup and its effective date.

Do not add Rock Golf to the selectable course registry or enable handicap match play until Rock Golf
provides:

1. the official ordered handicap indexes for holes 1 through 9;
2. confirmation of how the indexes apply when the nine-hole layout is played twice;
3. the official playing-handicap values or written calculation policy for both offered lengths and
   rating tables; and
4. the effective date of those values.
