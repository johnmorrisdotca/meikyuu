# Contributing

Ideas, bug reports and pull requests are welcome in the
[issues](https://github.com/johnmorrisdotca/meikyuu/issues).

## Working on it

```sh
pnpm install
pnpm check          # lint, types and tests: every maze level rebuilt, proved perfect and solved again
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:demo      # build the demo and play it in a real browser, at a phone's width and a desk's
```

A change to a generator, to the seeded stream or to the measure changes mazes, so it fails the level tests: a level published
keeps its number, and a recipe must rebuild the same maze for ever. Levels are only ever added to the end of the list (a new
version), made by `scripts/meikyuu-levels.ts`, never edited by hand. A new shape or algorithm is welcome as an addition, with a test that its mazes are perfect.

## Releasing

A version tag (`v1.2.3`, the same as `package.json`'s version) runs
`.github/workflows/release.yml`: it checks and builds the package, attaches the
tarball to a GitHub release, and publishes it to npm by trusted publishing,
with no token. Write the release in `CHANGELOG.md` first.
