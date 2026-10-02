// WHICH RATIO FITS A PHONE: `node scripts/phone-fit.mjs`. For real phones held upright it works out the biggest maze box of each ratio (width over
// height) that fits what the page leaves: the width less a gutter each side, and the height less the page's header and the board's own buttons
// and lines of words (284 px: a 390 x 844 phone leaves 390 x 560). Prints the Markdown table of docs/LEVELS.md. The rest of the page is the
// host's to measure; 284 is what the demo, and the site this was made for, spend.
const PHONES = [
  ["iPhone SE (2022)", 375, 667],
  ["Galaxy S23", 360, 780],
  ["Small Android", 360, 740],
  ["iPhone 15", 390, 844],
  ["Pixel 7", 412, 915],
];
const CHROME = 284;
const GUTTER = 24;
const RATIOS = [["1:1", 1], ["4:5", 4 / 5], ["2:3", 2 / 3], ["3:5", 3 / 5], ["1:2", 1 / 2]];
const ACROSS = [12, 16, 20];

const lines = [`| Phone (CSS px) | Left for the maze | ${RATIOS.map(([name]) => `${name} box`).join(" | ")} |`, `| --- | --- | ${RATIOS.map(() => "---").join(" | ")} |`];
for (const [name, w, h] of PHONES) {
  const room = [w - 2 * GUTTER, h - CHROME];
  const cells = RATIOS.map(([, ratio]) => {
    const width = Math.min(room[0], room[1] * ratio);
    return `${Math.round(width)} × ${Math.round(width / ratio)} (${Math.round(width / room[0] * 100)}%)`;
  });
  lines.push(`| ${name} ${w}×${h} | ${room[0]} × ${room[1]} | ${cells.join(" | ")} |`);
}
console.log(lines.join("\n"));
console.log();
const out = [`| Phone | Ratio | ${ACROSS.map((n) => `a cell with ${n} across`).join(" | ")} |`, `| --- | --- | ${ACROSS.map(() => "---:").join(" | ")} |`];
for (const [name, w, h] of PHONES.filter(([n]) => ["iPhone SE (2022)", "iPhone 15"].includes(n))) {
  for (const [rname, ratio] of RATIOS.filter(([n]) => ["1:1", "2:3", "1:2"].includes(n))) {
    const width = Math.min(w - 2 * GUTTER, (h - CHROME) * ratio);
    out.push(`| ${name} | ${rname} | ${ACROSS.map((n) => `${(width / n).toFixed(1)} px`).join(" | ")} |`);
  }
}
console.log(out.join("\n"));
