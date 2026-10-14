# In Angular and Next.js

How to use `<meikyuu-board>` in Angular and in Next.js. The React, Vue and Svelte recipes are in [the README](../README.md#on-a-server-in-a-page-and-in-a-framework). Moved here to keep the README under the length npm shows.

```ts no-check
// Angular: a standalone component with CUSTOM_ELEMENTS_SCHEMA
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/meikyuu/element/define";

@Component({
  selector: "app-maze",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<meikyuu-board level="40" board="wood" (meikyuu-solve)="solved($event)"></meikyuu-board>`,
})
export class Maze {
  solved(event: Event) { console.log((event as CustomEvent).detail.moves); }
}
```

In Next.js or any server-rendering framework, import the define entry from a client component, so the tag is defined in the browser. Or skip the tag and call `mountMeikyuu(element, options)` from `@johnmorrisdotca/meikyuu/play` in an effect: the handle it returns has `destroy()`.

These recipes are written to the tag's documented attributes and events; they are not built from the packed tarball by this repository's tests, which play the tag in a bare page in Chromium and WebKit.

These recipes are written to the tag's documented attributes and events; they are not built from the packed tarball by this repository's tests, which play the tag in a bare page in Chromium and WebKit.
