# Embed a fixed or UTC daily labyrinth puzzle

[Open the builder](https://johnmorrisdotca.github.io/meikyuu/builder.html) to preview a maze, arrows or mixed level and copy an element, iframe, module, React 19, Vue, Svelte, Angular, plain HTML block or iframe URL. Shared English/Japanese words and translated choice labels come from the family template. Code retains the attribute values; iframe titles follow the page language. The link carries the setup, and the iframe stores nothing.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
<meikyuu-board kind="maze" level="12" size="medium"></meikyuu-board>
<meikyuu-board kind="arrows" daily="2026-10-09" size="small"></meikyuu-board>
```

`size` sets display widths: small 320, medium 480, large 640 pixels. `width` overrides it while fitting the parent; existing tags with no display attribute retain their host width. `theme` is light, dark or auto, including explicit themes in shadow roots. `label` is optional spoken text. Existing ratio, orientation, gutter, reserve, fit and pan controls remain available.

`daily="today"`, an empty attribute, `on`, `true` or `1` uses the current UTC day; a real `YYYY-MM-DD` fixes one. Off aliases are `off`, `false`, `no` and `0`. The shared day-seed helper, namespaced by puzzle kind, chooses a level from its published list. An explicit recipe takes precedence. Changing the day starts fresh play; there is no daily rollover timer or persisted game.

Every observed attribute is reflected as a property, including camel-case spellings of kebab names. Reading `fit` retains its callable method; framework assignments set its attribute. Existing mounted-board methods remain available. `options` holds host callbacks, custom recipes and drawing options, including wall/line thickness and custom board/trail colours. Coverage is checked against the real mounted-board option keys, with reasons for host-only choices. `defineBoard(tag?)` registers a standard or custom tag without replacing a definition.

The transparent, noindex iframe is `embed/?kind=maze&level=12&size=medium`. It validates kinds, levels, dates, display/drawing choices, ratio, dimensions and recipe codes. Invalid values are ignored. It reuses the player's keyboard controls and reduced motion. The builder measures the preview and reserves room for the controls when printing frame height.

Existing `meikyuu-move`, `meikyuu-solve`, `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump`, `meikyuu-lose` and `meikyuu-stones` events now bubble across shadow boundaries with JSON-safe detail. `meikyuu-load` adds `{ kind, level, day }`; `meikyuu-error` adds `{ message }`. The iframe forwards the identical detail as `{ type: event.type, detail: event.detail }`. Hosts must check both `event.origin === "https://johnmorrisdotca.github.io"` and `event.source === iframe.contentWindow` before using a message. No identity fields are included.
