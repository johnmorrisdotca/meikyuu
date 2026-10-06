/**
 * THE MESSAGE OVER A FINISHED BOARD, "Solved in 3 strokes.", and how it is put away.
 *
 * It is a small pill at the top of the box with a close (x) button. A click or tap on it, the button, and Escape from anywhere in the board
 * all close it, and it stays closed until the puzzle is unsolved (Undo, Restart) or another is loaded and solved again. The pill is the
 * only part that takes the pointer, so turning, zooming, drawing and the buttons work whether it is open or not. The line of words under
 * the board says the same thing and is not closed.
 */

/** What the message is doing: wanted by the host, asked for by the puzzle's state, and put away by the player. */
export type BannerState = {
  /** Whether the host wants the message at all (the `banner` option). */
  enabled: boolean;
  /** Whether the player closed this one. */
  closed: boolean;
};

/** Whether the message shows: the host wants it, the puzzle is finished and the player has not closed it. */
export function bannerShows(state: BannerState, finished: boolean): boolean {
  return state.enabled && finished && !state.closed;
}

/** What the state is after the puzzle's state is read again: a puzzle that is not finished lets the message come back for the next win. */
export function bannerAfter(state: BannerState, finished: boolean): BannerState {
  return finished || !state.closed ? state : { ...state, closed: false };
}

/** The parts of the message, and what to do with them. */
export type Banner = {
  readonly element: HTMLElement;
  /** Say the words and show or hide the message, for a puzzle that is or is not finished. */
  sync: (text: string, closeLabel: string, finished: boolean) => void;
  /** Close it as the player would; true if it was showing. */
  close: () => boolean;
  /** Whether it is showing now. */
  open: () => boolean;
  /** Whether the host wants it (`set({ banner })`); the next `sync` shows or hides it. */
  enable: (on: boolean) => void;
  /** Take the key and click handlers off. */
  destroy: () => void;
};

/**
 * Make the message and wire it to `host`: Escape while focus is anywhere in the board closes it (and goes no further, so a page that also
 * leaves a mode on Escape leaves it on the next press).
 */
export function createBanner(document: Document, host: HTMLElement, enabled: boolean): Banner {
  const element = document.createElement("div");
  element.className = "mk-banner";
  element.dataset.show = "false";
  const text = document.createElement("span");
  text.className = "mk-banner-text";
  text.setAttribute("aria-hidden", "true");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mk-banner-close";
  button.dataset.action = "close-message";
  button.textContent = "×";
  element.append(text, button);

  let state: BannerState = { enabled, closed: false };
  let finishedNow = false;
  const draw = (): void => {
    element.dataset.show = String(bannerShows(state, finishedNow));
  };
  const close = (): boolean => {
    if (element.dataset.show !== "true") return false;
    state = { ...state, closed: true };
    draw();
    return true;
  };
  const onClick = (): void => {
    close();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !close()) return;
    event.preventDefault();
    event.stopPropagation();
  };
  element.addEventListener("click", onClick);
  host.addEventListener("keydown", onKey);

  return {
    element,
    sync: (words, closeLabel, finished) => {
      text.textContent = words;
      button.setAttribute("aria-label", closeLabel);
      finishedNow = finished;
      state = bannerAfter(state, finished);
      draw();
    },
    close,
    open: () => element.dataset.show === "true",
    enable: (on) => {
      state = { ...state, enabled: on };
      draw();
    },
    destroy: () => {
      element.removeEventListener("click", onClick);
      host.removeEventListener("keydown", onKey);
    },
  };
}
