import { SOLID_FIRST, SOLID_MORE_DICE, SOLID_MORE_SHAPES } from "../src/solid/solidKinds.ts";

/** The solids whose levels are in each of the three data files, and the files: the first five (`3d/levels`), the seven further dice (`3d/levels/dice`) and the six shapes (`3d/levels/shapes`). */
export const SOLID_GROUPS = { first: SOLID_FIRST, dice: SOLID_MORE_DICE, shapes: SOLID_MORE_SHAPES } as const;

export const SOLID_GROUP_FILES: Record<keyof typeof SOLID_GROUPS, { name: string; constant: string; title: string }> = {
  first: { name: "solid.data.ts", constant: "MEIKYUU_SOLID_ROWS", title: "THE FIRST FIVE SOLIDS (the cube, the globe and the tetrahedron, octahedron and icosahedron)" },
  dice: { name: "solid-dice.data.ts", constant: "MEIKYUU_SOLID_DICE_ROWS", title: "THE FURTHER DICE (the prism, the ten-sided, the twelve-sided, the sixteen-sided, the twenty-four and the thirty-sided)" },
  shapes: { name: "solid-shapes.data.ts", constant: "MEIKYUU_SOLID_SHAPE_ROWS", title: "THE SHAPES (the box, the cross, the ring, the torus, the star and the heart)" },
};
