import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "meikyuu-board": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { kind?: string; level?: string; board?: string; trail?: string; tap?: boolean; hints?: string; lang?: string; theme?: string };
    }
  }
}
