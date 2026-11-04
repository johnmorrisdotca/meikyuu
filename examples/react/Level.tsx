import "@johnmorrisdotca/meikyuu/element/define";

export function Level({ level = 40, board = "wood" }: { level?: number; board?: string }) {
  return <meikyuu-board level={String(level)} board={board} />;
}
