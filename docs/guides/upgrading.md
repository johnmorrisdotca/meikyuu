---
title: "Upgrading across level renumbering"
section: upgrading
order: 10
description: "Preserve recipe identity through versions 2 and 3."
---

## Major 2 changed the original numbered list

Version 2 rebuilt the four-size maze ladder and removed some original levels. `/levels/legacy` reads the original 1.0 numbering, its recipe and current mappings; a removed recipe can still build the same maze even when it is no longer a current level. Do not silently remap a saved solve by a guessed new number.

## Major 3 reordered by geometry-aware score

Version 3 retains the 2.3 recipes but reorders maze, tall, colossal and surface lists by the revised coverage-aware score. A solve kept by recipe is unaffected; a saved size/number link may refer to another maze. Custom MazeGeometry gained `points`, a breaking requirement for callers providing their own geometry. Use native geometry helpers or supply valid 2D/3D centres and the documented functions.

Current public major is 3. [The changelog](../../CHANGELOG.md) and [LEVELS.md](../LEVELS.md) retain the precise releases, fields and examples. Existing embed methods, reflected properties and explicit recipes remain as [the contract](../embeds.md) describes. Pin list versions when numbers alone must keep meaning.
