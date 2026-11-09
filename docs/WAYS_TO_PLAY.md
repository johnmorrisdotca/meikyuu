# The ways to play

Each is a declared field of a level, never inferred from the shape. A way to play decides where the line starts and ends.

| `mode` | The way it is played |
| --- | --- |
| `enter-leave` | In at one door in the outer wall, out at another, the two as far apart as the maze allows. |
| `to-goal` | From a cell inside the maze to a dot hidden deep in it. |
| `centre-out` | From the middle of the shape out through a door in the outer wall. |
| `keys` | From inside, picking up every key on the way to a door in the outer wall. A key is at the end of a branch, off the way, so each costs a detour. It is picked up by passing over it, and stays picked up when the line is drawn back. |

Beside the mazes there are two more kinds, each with its own list of levels (`MeikyuuKind`: `maze`, `arrows`, `mixed`):

- **Arrow puzzles.** A picture (a heart, a leaf, a star) made of arrow paths. Tap an arrow and it slides off the board the
  way its head points, if nothing is in its way; if another arrow is, it bumps and a heart is lost. Clear every arrow. Every puzzle can be
  cleared: each is built backwards, adding arrows that each have a clear way out at the moment they are added.
- **Mixed puzzles.** An arrow puzzle in which some arrows are locked, and a labyrinth beside it with an unlock button hidden deep inside.
  Draw a line through the labyrinth to the button and the locked arrows are freed. In the order of play these come after the plain ones.
