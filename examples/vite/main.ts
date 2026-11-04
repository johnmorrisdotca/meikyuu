import "@johnmorrisdotca/meikyuu/element/define";

const board = document.querySelector("meikyuu-board")!;
board.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail.moves));
