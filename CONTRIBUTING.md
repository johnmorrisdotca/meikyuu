# Contributing

Ideas, bug reports and pull requests are welcome in the
[issues](https://github.com/johnmorrisdotca/meikyuu/issues).

## Working on it

```sh
pnpm install
pnpm check          # lint, types and tests: every maze level rebuilt, proved perfect and solved again
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:demo      # build the demo and play it in a real browser, at a phone's width and a desk's
pnpm docs:make      # rewrite docs/strings-ja.md after changing a word of the board
```

A change to a generator, to the seeded stream or to the measure changes mazes, so it fails the level tests: a level published
keeps its number, and a recipe must rebuild the same maze for ever. Levels are only ever added to the end of the list (a new
version), made by `scripts/meikyuu-levels.ts`, never edited by hand. A new shape or algorithm is welcome as an addition, with a test that its mazes are perfect.

## House rules, shared by every package of the family

- Open an issue first for anything bigger than a typo, so that we can agree on the shape before you spend time on it.
- No runtime dependencies. Every function that plays or checks a game is pure: it returns new values and never changes what it was given.
- Tests sit beside the code they test. A rule you change has a test that would have caught it.
- Words a player reads come in English and Japanese. If you cannot write the Japanese, say so in the pull request and someone will.
- Option values and names are kebab case.
- Art and sound are CC0 or public domain only, checked at the source, and credited in the README. No GPL or LGPL code.
- Needs Node 22 or later. A change a user would notice gets a line in `CHANGELOG.md`.

## Releasing

A version tag (`v1.2.3`, the same as `package.json`'s version) runs
`.github/workflows/release.yml`: it checks and builds the package, attaches the
tarball to a GitHub release, and publishes it to npm by trusted publishing,
with no token. Write the release in `CHANGELOG.md` first.
