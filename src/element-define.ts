/**
 * Defines the `<meikyuu-board>` element on the page. Import it for its effect:
 *
 * ```html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@2/dist/element-define.js"></script>
 * <meikyuu-board level="12"></meikyuu-board>
 * ```
 *
 * A tag already defined is left as it is, and on a server, where there is no page, nothing happens.
 */
import { defineBoard } from "./element.ts";
defineBoard();
export * from "./element.ts";
