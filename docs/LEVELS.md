# The levels: what there are, how hard they are, and how many more there could be

Everything in the tables below is printed by `node scripts/levels-facts.ts [--capacity]`, `scripts/levels-trees.ts` and `scripts/phone-fit.mjs`; none is typed by hand. The charts and pictures are drawn by `scripts/levels-charts.mjs` and `scripts/readme-pictures.mjs`. Measured on 2026-10-02.

## The short answers

- **Are any levels locked?** No. Nothing in the package locks a level: every level of every list is open to `mountMeikyuu` and to `levelOf`, and a recipe can be played whether or not it is a level. (On the site that uses it, today no level is locked either: every level is open and Start plays the first not yet solved. Suido and Tsunagi lock blocks of 16 until the block before is solved; Meikyuu does not, and its sizes are 256 = 16 blocks of 16 for a site that wants to.)
- **Round numbers.** 256 maze levels to each of the four sizes, 1,024 in all, and 256 to each of six tall sizes, 1,536. Why 256 below.
- **Easy was too easy.** 62 of the 73 levels in the easy third of Small were too easy to be a level (28 of the 217 Small levels were solved by pointing at the goal and walking). Every level now has to be wrong-footed by the straight guess at least twice and cost it four cells, and the easy third has a floor that rises through it. Level 1 of Small is a 15-cell maze (3×5), not a 3×3.
- **How many more could be published?** For the squares-and-shapes lists, more than anyone will play: from 100,000 random recipes 51,835 small, 48,942 medium, 19,996 large and 5,000 huge mazes (of 5,000 drawn) were distinct and not too easy, every one a perfect maze with exactly one way through. The table is below; a safe cap of 4,096 to a size (sixteen times what is published) is reached in seconds to a minute on a laptop.
- **Vertical maps.** A whole new set: 1,536 tall levels, 2:3, six sizes (6×9 to 20×30 cells), with `orientation` to lie them down on a wide screen. 2:3 and not 1:2: the table is below.
- **Touch.** The board always leaves page beside it to scroll by (24 px a side at least, widening to 72 px with Zoom out), keeps touches only inside the box, draws with one finger and moves with two. The browser tests draw a tall maze from top to bottom by real touch, zoomed in and zoomed out, at 390×844 and 360×740, and check that the page still scrolls from the gutter and does not under the drawing finger.

## What the package holds

| Kind | Levels | Sizes and bands | On the site today |
| --- | --- | --- | --- |
| Mazes (`MEIKYUU_MAZE_LEVELS`) | 1024 | 4 sizes of 256: small, medium, large, huge; each size 86 easy, 85 medium, 85 hard | all 1,000 of the 1.0.0 list (217 small, 231 medium, 285 large, 267 huge) |
| Colossal mazes (`MEIKYUU_COLOSSAL_LEVELS`, `MEIKYUU_COLOSSAL_TALL_LEVELS`) | 256 | two lists of 128: square (about 10,000 cells) and tall (64×96) | not yet |
| Tall mazes (`MEIKYUU_TALL_LEVELS`) | 1536 | 6 sizes of 256: 6×9, 8×12, 10×15, 12×18, 16×24, 20×30; the same bands | not yet |
| Arrow puzzles (`MEIKYUU_ARROW_LEVELS`) | 300 | one list, 8 pictures, in thirds of 100 | no |
| Mixed puzzles (`MEIKYUU_MIXED_LEVELS`) | 100 | one list, in thirds (34, 33, 33) | no |

### The mazes, by size and third (now)

A *third* is the band the site derives: place 1 to 86 of a size is easy, 87 to 171 medium, 172 to 256 hard. Effort is cells drawn (`measureMaze`); score is `difficultyOf` (below); *Way* is the cells on the one way through; *Choices* are the forks on it; *Wrong turns* are forks where the straight guess goes wrong; *Straight guess wastes* is the cells that guess draws that it need not.

| Size | Band | Levels | Cells | Effort | Score | Way (cells) | Choices | Wrong turns | Dead ends | Straight guess wastes |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| small | easy | 86 | 15–48 | 22–47 | 18–29 | 11.1 | 4.7 | 2.7 | 8.4 | 9.8 |
|  | medium | 85 | 33–143 | 47–99 | 27–39 | 21.1 | 9.2 | 3.2 | 18.9 | 18.2 |
|  | hard | 85 | 72–148 | 101–226 | 34–50 | 45.3 | 15.7 | 5.7 | 27.6 | 28.9 |
| medium | easy | 86 | 150–361 | 95–244 | 35–53 | 46.2 | 19.2 | 5.8 | 56.7 | 56.9 |
|  | medium | 85 | 217–760 | 246–405 | 45–61 | 78.9 | 29.9 | 11.3 | 102.3 | 127.8 |
|  | hard | 85 | 281–798 | 409–1203 | 49–69 | 157.2 | 32.0 | 12.6 | 107.2 | 185.4 |
| large | easy | 86 | 806–3102 | 363–811 | 53–71 | 110.3 | 53.7 | 19.4 | 353.5 | 333.8 |
|  | medium | 85 | 836–3961 | 815–1200 | 61–77 | 187.4 | 76.3 | 28.7 | 534.5 | 681.3 |
|  | hard | 85 | 1020–3969 | 1200–2121 | 67–82 | 366.1 | 89.0 | 34.4 | 542.8 | 913.1 |
| huge | easy | 86 | 4096–8911 | 1094–2519 | 74–89 | 272.9 | 162.6 | 63.0 | 1802.8 | 2224.4 |
|  | medium | 85 | 4020–8910 | 2536–3665 | 78–94 | 646.1 | 187.9 | 80.2 | 1599.1 | 2793.5 |
|  | hard | 85 | 4386–8923 | 3668–4990 | 83–96 | 1223.2 | 183.9 | 79.6 | 1171.2 | 2512.4 |

### Shapes, ways to play and algorithms in every size

| Size | square | hex | triangle | circle | heart | leaf | star | ring | diamond | cross | moon | hexagon | pyramid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | 50 | 32 | 21 | 27 | 9 | 11 | 10 | 21 | 16 | 11 | 11 | 21 | 16 |
| medium | 32 | 20 | 16 | 19 | 19 | 22 | 23 | 20 | 17 | 20 | 13 | 18 | 17 |
| large | 32 | 25 | 19 | 16 | 24 | 20 | 21 | 17 | 20 | 13 | 10 | 17 | 22 |
| huge | 42 | 13 | 21 | 23 | 22 | 21 | 13 | 7 | 19 | 22 | 17 | 18 | 18 |

| Size | enter-leave | to-goal | centre-out | keys | backtracker | hunt | growing | prim | kruskal | wilson | eller |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | 64 | 82 | 59 | 51 | 22 | 34 | 61 | 51 | 38 | 37 | 13 |
| medium | 59 | 44 | 58 | 95 | 61 | 47 | 44 | 25 | 38 | 37 | 4 |
| large | 56 | 69 | 73 | 58 | 41 | 46 | 40 | 39 | 42 | 42 | 6 |
| huge | 62 | 73 | 72 | 49 | 73 | 33 | 29 | 33 | 40 | 42 | 6 |

### The arrow puzzles

| square | diamond | cross | ring | heart | moon | leaf | star |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 121 | 39 | 31 | 27 | 22 | 26 | 19 | 15 |

Arrow and mixed levels are untouched by this release. They are not on the site today.

## Round numbers: why 256

The site's levels page is a board of blocks of sixteen, in two rows of eight, and Suido has 256 to a size. 256 is sixteen pages of sixteen, a third of it is 85⅓ (86, 85, 85 as the site derives easy, medium and hard), and it is within reach of every size: Large and Huge of 1.0.0 had 285 and 267 good levels, so 256 cuts the hardest 29 and 11; Small and Medium had 217 and 231 and are filled to 256 with 39 and 25 new levels. 128 would have thrown away half of Large and Huge; 512 would need 295 new Small mazes of fewer than 150 cells when the 4×4 has only 100,352 different ones and a Small maze has to be small; 192 and 288 are not sixteen pages of sixteen.

## How hard a maze is to play: the score

`measureMaze` gives an **effort**: an estimate of cells drawn. It is mostly size. A 5×5 maze that the straight guess walks through and a 5×5 maze with a long wrong turn have nearly the same effort. `difficultyOf(maze)` adds what makes two mazes of one size easy or tricky, on one scale from 0 to 100:

| Term | What is counted | Weight | Ceiling (full weight at) |
| --- | --- | ---: | --- |
| reach | the effort, on the log scale `ratingOf` uses | 40% | 5,400 |
| forks | places on the way where the line could have gone another way | 15% | 400 |
| traps | forks where the **straight guess** is wrong | 15% | 160 |
| waste | cells the straight guess draws that are not on the way | 15% | 4,500 |
| depth | the longest wrong branch | 7.5% | 1,100 |
| turns | bends on the way (a heading change of more than 25 degrees) | 7.5% | 1,300 |

The straight guess is what a person does with no plan: at every fork take the passage that points most nearly at the goal, back out of dead ends, and try the next best. Each term other than reach is `ln(1 + count) / ln(1 + ceiling)`, capped at 1; the ceilings are the biggest the 1.0.0 lists reach, so the hardest maze in the lists scores in the 90s. All of it is whole numbers counted off the passages and plain arithmetic, so the same maze scores the same in every engine. Perfect mazes have no loops, so "a loop" cannot be a twist in this package; the twists are the longer wrong turn, the trap that looks like the way, and the key.

**Too easy** (`isTooEasy`): a maze that has fewer than 4 cells the straight guess draws in vain, fewer than 2 traps, fewer than 3 forks on the way, fewer than 3 wrong branches or fewer than 4 dead ends. In the easy third of a size there is a floor that rises (`easyFloorAt`): at place 1 the least, at place 86 3 traps, 5 forks and 8 wasted cells.

### The easy third, before and after

| Size | Levels | Too easy to keep | Of them, the straight guess walks straight to the goal | In the easy third |
| --- | ---: | ---: | ---: | ---: |
| small | 217 | 99 | 28 | 62 |
| medium | 231 | 7 | 1 | 5 |
| large | 285 | 0 | 0 | 0 |
| huge | 267 | 0 | 0 | 0 |

| Size | L1 | L5 | L10 | L20 | L40 | L60 | L86 | L128 | L171 | L214 | L256 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small, 1.0.0 (level at the same place in its 217) | 2 | 7 | 15 | 10 | 19 | 19 | 22 | 31 | 36 | 34 | 43 |
| small, now | 18 | 20 | 20 | 21 | 22 | 25 | 29 | 33 | 37 | 44 | 44 |
| medium, 1.0.0 (level at the same place in its 231) | 36 | 41 | 38 | 44 | 46 | 47 | 50 | 48 | 53 | 61 | 65 |
| medium, now | 36 | 41 | 45 | 40 | 45 | 47 | 48 | 51 | 57 | 65 | 69 |
| large, 1.0.0 (level at the same place in its 285) | 57 | 58 | 59 | 62 | 68 | 68 | 66 | 73 | 68 | 79 | 83 |
| large, now | 57 | 55 | 61 | 59 | 66 | 69 | 64 | 67 | 77 | 76 | 78 |
| huge, 1.0.0 (level at the same place in its 267) | 76 | 75 | 81 | 81 | 83 | 87 | 84 | 88 | 86 | 91 | 95 |
| huge, now | 76 | 75 | 81 | 80 | 84 | 84 | 88 | 84 | 94 | 87 | 93 |

![The easy third of Small, drawn to one scale: seven levels of 1.0.0 above, seven of now below](easy-before-after.jpg)

![Score by level of each size: 1.0.0 dashed, now solid](score-by-level.svg)

Small's easy third used to begin with a 3×3 and score 2 to 26 with 1.1 wrong turns on average; it now scores 18 to 29, from a 15-cell maze to a 48-cell one, with 2.7 wrong turns on average, and the floor rises through it. Medium, Large and Huge were not too easy (Medium lost 7 mazes); their tables above match 1.0.0's closely because most of their levels are the same levels.

The list is still ordered by effort, as the first release promised ("no level is easier to draw than the one before"). The score rises along each size in thirds and in pages of sixteen, but one level can score a few points under the best before it (the largest dip is 16 points, in Medium); a test holds it to 18.

## What changed, and what a site must do

| Size | Band | Levels | Cells | Effort | Score | Way (cells) | Choices | Wrong turns | Dead ends | Straight guess wastes |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| small (217) | easy | 73 | 9–43 | 9–41 | 2–26 | 10.2 | 3.5 | 1.1 | 7.0 | 4.1 |
|  | medium | 72 | 28–107 | 41–81 | 19–37 | 18.3 | 8.0 | 2.3 | 15.3 | 10.4 |
|  | hard | 72 | 56–144 | 82–167 | 27–44 | 31.6 | 12.7 | 3.9 | 26.6 | 23.4 |
| medium (231) | easy | 77 | 150–346 | 95–230 | 33–53 | 45.7 | 18.5 | 5.5 | 53.7 | 51.1 |
|  | medium | 77 | 184–760 | 232–360 | 37–58 | 73.1 | 27.4 | 9.8 | 92.6 | 106.2 |
|  | hard | 77 | 281–793 | 364–961 | 49–65 | 126.1 | 33.6 | 13.2 | 117.7 | 169.2 |
| large (285) | easy | 95 | 806–3344 | 363–838 | 53–71 | 116.6 | 54.6 | 19.7 | 365.9 | 354.4 |
|  | medium | 95 | 836–3969 | 840–1320 | 61–77 | 209.6 | 76.0 | 28.9 | 515.1 | 722.3 |
|  | hard | 95 | 1444–3997 | 1321–4163 | 68–87 | 528.6 | 96.9 | 39.4 | 530.9 | 974.3 |
| huge (267) | easy | 89 | 4096–8911 | 1094–2549 | 74–89 | 276.2 | 165.6 | 64.2 | 1813.8 | 2272.3 |
|  | medium | 89 | 4020–8910 | 2581–3721 | 78–94 | 674.7 | 186.6 | 79.8 | 1563.4 | 2752.4 |
|  | hard | 89 | 4454–8923 | 3736–5371 | 84–96 | 1297.5 | 175.3 | 76.4 | 1112.2 | 2531.8 |

A size keeps its **places**. The first release's levels, by size and place (the site's "size and level number"):

| Size | 1.0.0 places | Same maze, same place | A new maze at the place (the old one was too easy) | Added at the end | Gone (cut off the end) |
| --- | ---: | ---: | --- | ---: | --- |
| Small | 217 | 109 | 108: places 1–37, 39–52, 54–59, 62–70, 72–73, 76–89, 94–95, 99, 101–102, 106, 110, 114–117, 120–123, 127–128, 136, 138, 146, 148, 156, 169, 172, 179, 190 | 39 (218–256) | none |
| Medium | 231 | 222 | 9: places 23, 25, 31, 33, 45–46, 52, 140, 147 | 25 (232–256) | none |
| Large | 285 | 256 | none | 0 | 29: places 257–285 |
| Huge | 267 | 256 | none | 0 | 11: places 257–267 |

843 of the 1,000 stay at the same place with the same maze. **Compatibility breaks, all of them:**

1. `MEIKYUU_MAZE_LEVELS` is 1,024 long and ordered by size, so the *global* number of every level from 218 up changes (a level's number in its size does not, apart from the rows above). Anything that stored a global number (a link, a kept run) needs the map. This is why this is a **major release (2.0.0)**: the first release said a level keeps its number.
2. 108 Small and 9 Medium places hold a different maze. A solve kept **by recipe** is still a solve of the maze it was (a recipe never changes what it builds); a solve kept by "size and place" now names the new maze. The new maze is about as hard as the old was meant to be, never easier to draw than the place before it.
3. 40 levels (the hardest 29 of Large and 11 of Huge) are not levels any more. They are still playable as recipes.
4. The effort no longer rises along the whole list (Medium begins easier than Small ends).

**The migration answer is data, exported as `@johnmorrisdotca/meikyuu/levels/legacy`:** `MEIKYUU_LEGACY_MAZE_LEVELS`, `legacyLevelOf(oldNumber)`, `legacyLevelOfCode(recipe)`. Each row has the recipe, `size`, `place` (the number in its size in 1.0.0), `now` and `nowInSize` (where the same maze is now, or null), and `nearest` (the level now at its place). A site with solves by recipe keeps them as they are and uses `legacyLevelOfCode` to mark the retired ones; a site with solves by place finds them in `nearest`. The demo does this for a visitor's saved progress.

## How many more could be published

| Size | Drawn | Seconds | ms a maze | Hard enough (not too easy) | Distinct | Easy-band scores | Medium-band | Hard-band |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | 100,000 | 7 | 0.1 | 51,835 | 51,835 | 10,572 | 24,087 | 17,176 |
| medium | 50,000 | 18 | 0.4 | 48,942 | 48,942 | 15,061 | 22,210 | 11,671 |
| large | 20,000 | 50 | 2.5 | 19,996 | 19,996 | 3,529 | 12,919 | 3,548 |
| huge | 5,000 | 39 | 7.9 | 5,000 | 5,000 | 3,822 | 1,090 | 88 |

*Hard enough* are the draws that pass `isTooEasy`; *Distinct* are those whose structure (shape, dimensions, way to play, start, goal, keys and the tree) is not the same as another's; the three *band* columns count the distinct ones whose score falls in the range of that third of the published size (Small: up to 29, to 39, above; and so on). A draw is a random recipe in the size's cell range, with every shape, way to play and algorithm; the hard bands are rare among random draws (88 of 5,000 Huge draws) because the hardest mazes are made by the long winding algorithms and a recipe is drawn that way by a targeted search, as the end of Small and Medium were made.

**Can the generator make more from more seeds?** Yes, without limit for any size above the smallest. A recipe's seed is a 32-bit integer and the algorithm, the shape, the dimensions and the way to play are separate choices, so there are about 4 billion mazes for each combination. Every maze is a spanning tree of its cells, so it is perfect (exactly one way between any two cells) by construction, and `candidateOf` checks it again with `isPerfect` before a draw is kept; every published level is also solved by drawing its way with the game's own rules on every build. What does limit it is the smallest grids, which have only so many different mazes. The most there can be on a grid is its number of spanning trees (Kirchhoff's matrix-tree theorem, computed exactly):

| Grid | Cells | Different mazes (spanning trees) |
| --- | ---: | ---: |
| square 3×3 | 9 | 192 |
| square 4×3 | 12 | 2,415 |
| square 4×4 | 16 | 100,352 |
| square 5×4 | 20 | 4,140,081 |
| square 5×5 | 25 | 557,568,000 |
| square 6×6 | 36 | 3.25 × 10^13 |
| square 7×7 | 49 | 1.98 × 10^19 |
| square 8×8 | 64 | 1.26 × 10^26 |
| square 10×10 | 100 | 5.69 × 10^42 |
| hex 4×4 | 16 | 14,682,473 |
| hex 6×6 | 36 | 1.32 × 10^19 |
| triangle 8×4 | 32 | 5,379,072 |
| circle 3 | 19 | 107,794,125 |
| circle 5 | 67 | 1.59 × 10^31 |
| hexagon 2 | 19 | 2,300,606,464 |
| hexagon 4 | 61 | 6.14 × 10^35 |
| square 6×9 | 54 | 2.66 × 10^21 |
| square 8×12 | 96 | 5.26 × 10^40 |
| square 10×15 | 150 | 1.28 × 10^66 |
| square 12×18 | 216 | 3.84 × 10^97 |

So the 3×3 has 192 mazes and the 4×4 100,352 (before the choice of start and goal multiplies them); from 5×5 up there are more than anyone will ever play. **Safe cap:** 4,096 levels to a size (sixteen times the published 256) is within what was drawn for Small and Medium (12× over), Large (4.9×) and, with every one of the 5,000 draws distinct and not too easy, Huge (1.2×; more were not drawn). The draws in the table took 7 seconds (Small), 18 (Medium), 50 (Large) and 39 (Huge) on a laptop (0.1, 0.4, 2.5 and 7.9 ms a maze, built and measured). The generator is `scripts/meikyuu-levels.ts`; new levels would be a new file added to the end (a new version), never a rewrite.

The arrow list (300) and the mixed list (100) are made the same way (`scripts/meikyuu-arrows.ts`): an arrow board is built backwards so that it can always be cleared, so more seeds mean more boards with the same guarantee; they are not on the site, and nothing was measured for them here.

## Tall maps

A tall maze is an ordinary maze with a tall recipe (`square:10x15:...`), two columns of cells to three rows, in a box two thirds as wide as it is tall. **I built 2:3 and not 1:2.** What a phone held upright leaves for the maze, once the page's header and the board's own buttons and words are paid for (284 px, as a 390×844 phone leaves 390×560), less a gutter of 24 px each side:

| Phone (CSS px) | Left for the maze | 1:1 box | 4:5 box | 2:3 box | 3:5 box | 1:2 box |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone SE (2022) 375×667 | 327 × 383 | 327 × 327 (100%) | 306 × 383 (94%) | 255 × 383 (78%) | 230 × 383 (70%) | 192 × 383 (59%) |
| Galaxy S23 360×780 | 312 × 496 | 312 × 312 (100%) | 312 × 390 (100%) | 312 × 468 (100%) | 298 × 496 (95%) | 248 × 496 (79%) |
| Small Android 360×740 | 312 × 456 | 312 × 312 (100%) | 312 × 390 (100%) | 304 × 456 (97%) | 274 × 456 (88%) | 228 × 456 (73%) |
| iPhone 15 390×844 | 342 × 560 | 342 × 342 (100%) | 342 × 428 (100%) | 342 × 513 (100%) | 336 × 560 (98%) | 280 × 560 (82%) |
| Pixel 7 412×915 | 364 × 631 | 364 × 364 (100%) | 364 × 455 (100%) | 364 × 546 (100%) | 364 × 607 (100%) | 316 × 631 (87%) |

(The percentage is the width of the box against the width the phone leaves.) 2:3 uses the full width on every phone but the iPhone SE (78%); 1:2 loses 13 to 41% of the width, and a 1:2 maze 12 cells across has cells of 16 px on the SE and 23 on an iPhone 15 where 2:3 has 21 and 28:

| Phone | Ratio | a cell with 12 across | a cell with 16 across | a cell with 20 across |
| --- | --- | ---: | ---: | ---: |
| iPhone SE (2022) | 1:1 | 27.3 px | 20.4 px | 16.4 px |
| iPhone SE (2022) | 2:3 | 21.3 px | 16.0 px | 12.8 px |
| iPhone SE (2022) | 1:2 | 16.0 px | 12.0 px | 9.6 px |
| iPhone 15 | 1:1 | 28.5 px | 21.4 px | 17.1 px |
| iPhone 15 | 2:3 | 28.5 px | 21.4 px | 17.1 px |
| iPhone 15 | 1:2 | 23.3 px | 17.5 px | 14.0 px |

On the iPhone 15 the room is 342×560, a ratio of 0.61, so 3:5 would fit it best; 2:3 is the nearest ratio with whole numbers of cells for squares (6×9, 8×12, ...) and loses 2% of the width. A 1:2 "tower" is not built; the package takes any recipe, so a site that wants one can make its own (`orientation` and the touch design below work for any ratio).

### The six sizes

| Size | Band | Levels | Cells | Effort | Score | Way (cells) | Choices | Wrong turns | Dead ends | Straight guess wastes |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 6×9 | easy | 86 | 45–54 | 46–58 | 27–32 | 17.5 | 6.1 | 3.2 | 13.2 | 19.8 |
|  | medium | 85 | 45–54 | 58–71 | 30–35 | 21.3 | 8.7 | 3.8 | 13.4 | 14.0 |
|  | hard | 85 | 45–54 | 71–83 | 31–38 | 22.7 | 11.8 | 4.8 | 14.8 | 13.2 |
| 8×12 | easy | 86 | 91–100 | 73–94 | 32–39 | 23.0 | 8.8 | 3.8 | 25.1 | 31.4 |
|  | medium | 85 | 91–100 | 95–116 | 34–42 | 32.8 | 11.9 | 4.4 | 23.2 | 25.2 |
|  | hard | 85 | 91–100 | 116–137 | 37–45 | 37.9 | 16.6 | 6.8 | 24.4 | 24.9 |
| 10×15 | easy | 86 | 144–156 | 100–133 | 36–44 | 29.0 | 11.5 | 4.2 | 39.7 | 45.9 |
|  | medium | 85 | 144–156 | 133–165 | 38–47 | 43.0 | 15.4 | 5.6 | 35.4 | 38.4 |
|  | hard | 85 | 144–156 | 166–198 | 40–50 | 56.3 | 22.0 | 8.3 | 35.6 | 38.6 |
| 12×18 | easy | 86 | 210–220 | 129–178 | 39–49 | 36.3 | 15.2 | 5.2 | 57.6 | 66.8 |
|  | medium | 85 | 210–220 | 179–227 | 41–52 | 56.6 | 19.9 | 7.3 | 50.3 | 62.3 |
|  | hard | 85 | 210–220 | 228–276 | 43–55 | 74.4 | 29.3 | 11.2 | 51.3 | 54.4 |
| 16×24 | easy | 86 | 350–399 | 191–285 | 43–55 | 52.2 | 21.8 | 7.5 | 99.2 | 108.6 |
|  | medium | 85 | 350–399 | 286–378 | 48–59 | 84.5 | 30.6 | 11.2 | 87.6 | 118.7 |
|  | hard | 85 | 350–399 | 379–472 | 50–62 | 125.5 | 39.3 | 16.1 | 77.5 | 112.0 |
| 20×30 | easy | 86 | 576–600 | 263–419 | 47–61 | 66.2 | 30.7 | 10.3 | 161.0 | 155.8 |
|  | medium | 85 | 576–600 | 420–574 | 53–66 | 129.6 | 42.9 | 17.2 | 131.9 | 204.2 |
|  | hard | 85 | 576–600 | 576–730 | 55–68 | 190.8 | 41.8 | 17.1 | 95.6 | 164.6 |

A size has about as many cells in every shape (a hexagon or triangle maze has smaller cells, so the same number of them fills the same box with bigger cells), and the squares are the whole numbers 6×9, 8×12, 10×15, 12×18, 16×24 and 20×30. In a 342-px box, 6, 8, 10 and 12 across are cells of 57, 43, 34 and 28 px; 16 and 20 across are 21 and 17 px and want zoom on a phone, which is what the touch design is for. Every level has the floor of the end of the easy third from its first place (the smallest has 45 cells, so it can be asked). Shapes are balanced through every third; the ways to play are balanced too, except the hard third of the largest size, where the keys' detours put most of the high efforts.

![Score by level of the six tall sizes](tall-score-by-level.svg)

### Turning

`orientation: "portrait" | "landscape" | "auto"` (default `auto`). The picture is turned a quarter counter-clockwise (the maze's top ends up on the left); the maze, its cells and the line drawn are as they were made. `auto` looks at the room: the host's width less the gutters, and the window's height less `reserve` (200 px, and not under 60% of the window). It turns the maze when that makes it bigger by more than a twelfth, so a phone upright keeps a tall maze upright, a phone on its side or a desk lies it down, a square room or a square maze is never turned, and a host that sets a square box is not turned either. The host adds a choice with `mount.orientation(setting)` (the demo has Auto, Upright, Lying down), and `meikyuu-orientation` fires when a resize makes `auto` decide again.

A line is the same line either way up. A pointer's path over the picture is carried back into the maze (`cellsAlong`, one function used by the board and the tests) before the game hears of it, and a line stored as its steps (`lineToSteps`: one base-36 character a step, the place of the next cell among the neighbours of the one before) is the same string. **Tested for all 13 shapes and all four ways to play** in `src/orientation.test.ts` (the path and steps drawn upright and turned are equal), and **in a real browser for all 13 shapes** (`e2e/orientation.demo.mjs`: the first 8 cells of the way drawn with the mouse on a board shown each way up read back the same cells and steps; and a line begun upright and finished lying down is the whole way).

![A tall maze on a phone, whole, with a line drawn](tall-phone.jpg)
![The same after Zoom out has widened the gutters](tall-gutters.jpg)
![The same lying down on a 1440 by 900 desk](tall-desktop.jpg)

## Touch: one finger draws, so something else must scroll

The worry: a maze that fills the window leaves nowhere to put a finger to scroll the page, and a finger drawing must not scroll it. As built (`src/mount.ts`, `src/surface.ts`, `src/playStyle.ts`):

1. **Gutters.** The box is never wider than the window less `gutter` each side (24 px by default; CSS `min(100%, 100vw - 2*gutter, max(100dvh - reserve, 60dvh) * aspect)`), and the page beside it is the browser's.
2. **`touch-action: none` on the box only.** Everything else, the host included, has `pan-y pinch-zoom`, so a swipe in a gutter, on the buttons or on the words scrolls the page and the page can still be pinched. The box also has `overscroll-behavior: contain`.
3. **Zoom out far enough to see the body.** Zoom out (the pad's − or two fingers coming together) shrinks the maze to a little past the fit and then widens the gutters, 24 → 48 → 72 px a side (`MEIKYUU_GUTTER_MAX`), and Zoom in (or fingers apart) brings them in first. It only does this where the page would show: not on a desk where the host is already narrow. `mount.gutter(px)` sets it; Fit puts it back.
4. **Fit** is `both` (the whole maze), `width` or `height` (`fit` option, `mount.fit(mode)`); a board bigger than the box in a direction starts at its top or left. A box that is resized (the gutters widening) keeps its zoom relative to the fit and the middle of what it shows, so a narrower box does not crop a fitted maze.
5. **Two fingers pan and pinch** a zoomed maze; one finger pressed away from the line's end moves the view too (a hand on a map); one finger on the end of the line draws. The **Move** button (`mount.pan(true)`, `pan` option) makes every one-finger drag move the view, for a mouse or a finger that cannot find the line's end.
6. **Edge auto-pan** while drawing: gentle (nothing 44 px from the edge, rising to 7 px a frame at the edge), off with `edgePan: false` or `edge-pan="off"`.

`e2e/touch.demo.mjs` (Chromium at 390×844, at 360×740, and WebKit for the parts that need no CDP) checks: the box is at least 24 px from both sides of the window; its `touch-action` is `none` and the host's has `pan-y`; **a real touch swipe (Chromium's `synthesizeScrollGesture`) on the box scrolls nothing and draws nothing, and the same swipe in the gutter scrolls the page**; a tall maze is drawn from its top to its bottom by one touch at the size the box fits, at 360 across, zoomed in a stretch at a time with two fingers moving the view between (the page does not move through any of it), and zoomed out with the gutters at 72 px (with the page scrolling from the gutter between); two fingers move a zoomed maze and draw nothing; the Move button; a pinch widens the gutters and the opposite pinch narrows them; and a line held at the edge moves the view or not as asked.

## Colossal mazes (2.1.0)

The biggest the lists go: two lists of 128 in an entry of their own (`@johnmorrisdotca/meikyuu/levels/colossal`), made by `scripts/meikyuu-colossal.ts` on 2026-10-05 from two pools of 6,000 mazes each, a ramp of the effort from the 3rd percentile to the 97th, as the tall lists are.

| List | Levels | Cells | Effort | Score | Rating | Shapes and ways to play |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Square (`MEIKYUU_COLOSSAL_LEVELS`) | 128 | 9,514 to 11,995 | 1,744 to 9,762 | 80 to 99 | 83 to 100 | all 13 shapes (8 to 13 levels each); to-goal 31, centre-out 31, enter-leave 33, keys 33 |
| Tall (`MEIKYUU_COLOSSAL_TALL_LEVELS`) | 128 | 6,059 to 6,144 (64×96 for a square one) | 1,224 to 6,008 | 71 to 95 | 77 to 100 | square 44, hex 42, triangle 42; to-goal 28, centre-out 27, enter-leave 29, keys 44 |

- **Why 128 and not 256, and why recipes.** A level is a recipe (about 60 characters), so a list is 17 KB for both, and the maze is built from its seed where it is played: 20 to 65 ms in Node for ten thousand cells (the cut-out shapes, which are built from a raster two to three times as big, take the most). Nothing is generated ahead and nothing needs to be generated on demand beyond that. Colossal mazes take much longer to solve than a huge one (the way through is up to 5,009 cells), so eight pages of sixteen is plenty.
- **The scoring is the same.** `difficultyOf` is unchanged, its terms still scaled to the biggest the older lists reach, so the colossal scores run 71 to 99 and the order inside a list is by effort, which has more room. A colossal square maze is harder than every huge one at the top (9,762 against 4,990), and the smallest of them has more cells than the biggest huge one (9,514 against 8,923). `isTooEasy` holds every one.
- **Why the tall one is 64×96.** The tall sizes' recipe form (`square:64x96:…`) and `tallDimensions` already serve it (hexagons 59×103, triangles 83×73, both 2:3 within a few per cent): a width of 80 would need 120 rows, the most `tallDimensions` looks at. 6,144 cells on a phone 342 px across is 5 px a cell at the fit: zoom is the way in, as for every big maze.
- **Cut-out shapes in the square list** are cut from a raster up to 190 across (36,100 cells laid out), inside `MEIKYUU_MOST_CELLS` (40,000), so a recipe is still refused above what any level lays out.

### Drawing a line ten thousand cells wide, measured

Chromium 1.63 on the Mac, a 390×844 touch viewport, CPU slowed four times (`Emulation.setCPUThrottlingRate`, about a mid-range phone), the demo page, the colossal square level with the longest way through (`ring:143:backtracker:centre-out`, 5,009 cells), a finger crossing six cells a frame from the start to the goal, then 40 wheel zooms and 120 pointer moves of a pan:

| | before | after |
| --- | ---: | ---: |
| Cost of the six pointer events of a frame (mean) | 22.6 ms | 6.1 ms |
| Frames while drawing (mean / 95th percentile) | 28.3 / 50.0 ms | 16.7 / 16.7 ms |
| Frames while zooming and panning (mean / 95th percentile) | 16.6 / 16.7 ms | 16.7 / 16.7 ms |
| Page ready, with the maze built from its recipe | 569 ms | 551 ms |

The cost was the line: every pointer event rebuilt the whole `d` attribute of the line (5,009 points) and the game copied the line, so a line of n cells cost n for each of n cells. The line is now kept as text with where each cell's piece ends (`mazeSurface.ts`): a maze is a tree, so two lines from the start that are the same at one place are the same up to it, the part kept is found by a binary search, and only the cells after it are written; the attribute is set once a frame. Walls were already cut into tiles of ten cells drawn only while on screen, so zooming and moving were at the frame rate before and after, and **the board stays SVG**: canvas would have been a second renderer for no gain. The tall list (3,033 cells the longest way) measured 12.7 ms for the six events before the change and 5.7 now, at 16.7 ms frames. A line of more than 600 cells does not ripple on winning (the ripple repaints the whole line each frame).

`e2e/colossal.demo.mjs` holds what must stay true: the line's text is `linePath` of the game's own path after every kind of change (drawn on, cut back by three hundred, drawn on down another way, undone, restarted), on the longest way of each list.

One thing found and not explained: **WebKit on Linux** (software painting, Playwright's `webkit` in the official Linux image) stalls for twenty to seventy seconds a frame once a line of five thousand cells is on the demo page and the page changes anything (it does when it hears the win, and when a button is clicked). The package's own board in a bare page does not (27 ms), WebKit on a Mac does not, Chromium on Linux does not, and an empty maze on the demo page does not. The 2.0.1 demo's own huge-maze smoothness test (`e2e/zoom.demo.mjs`) fails in that engine too, so it is that engine's software painting of an SVG this big and not a cost of this release; the browser test that draws the long line skips that one engine.

## Making them again

```sh
node scripts/meikyuu-levels.ts       # the square lists, from the 1.0.0 list (about two minutes)
node scripts/meikyuu-tall.ts         # the tall lists (about a minute)
node --experimental-strip-types scripts/meikyuu-colossal.ts   # the colossal lists (about six minutes)
node scripts/levels-facts.ts --capacity > facts.md    # the tables (about two minutes more)
node scripts/levels-trees.ts         # spanning trees
node scripts/phone-fit.mjs           # the phone table
node scripts/levels-charts.mjs       # the charts and the easy-third picture (pnpm build first)
node scripts/readme-pictures.mjs     # the demo's pictures (pnpm site first)
```
