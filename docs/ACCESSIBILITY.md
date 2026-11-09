# Accessibility

A maze is drawn with a finger or a mouse, so what a person who cannot see it hears, and what a person who cannot drag can do, are worth saying plainly.

- **A keyboard plays it.** Focus the board and the arrow keys step the line one cell, Enter or Space begins a line at the start, Backspace, Delete or Ctrl+Z take a stroke back, and with Shift the arrow keys lay a stone beside the line. Tab reaches the board, the buttons and the zoom pad in the order they are drawn.
- **The words are spoken.** The board is a labelled group, the line of progress and the line of messages are polite live regions (a key picked up, a bump, a win), and every button has a name from the board's own words, in English or Japanese by the page's `lang`. The drawing itself is hidden from a screen reader (`aria-hidden`), because a maze has no useful reading cell by cell.
- **Touch targets are large.** Every button and tab is at least 44 pixels each way, and some page is always left beside the board for a finger to scroll by: only the board itself asks the browser to keep touches.
- **Not by colour alone.** The start, the goal, the doors and the keys are different shapes; the line is a thick path and not a colour only; the five line colours and six boards include a black board for contrast.
- **Motion.** Under a request for reduced motion nothing moves: the arrows do not slide or shake and the trail does not ripple.
- **Colour and contrast.** Every colour is a CSS variable (see [Theming](../README.md#theming)); the `paper` board follows the page's light or dark. The defaults have not been measured against a contrast standard.
- **Known to fall short.** Drawing a line is a pointing task, and the keyboard steps one cell at a time, which for a maze of ten thousand cells is a long way; a screen reader hears that a maze is there, and how far the line has got, and not its shape. The Japanese words have not been read by a native reader ([Languages](../README.md#languages)).
