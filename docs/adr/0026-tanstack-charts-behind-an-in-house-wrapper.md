# ADR-0026: TanStack Charts behind an in-house chart wrapper, proven by a spike, with shadcn chart as the fallback

- **Status:** Proposed — to be implemented by the usage epic, starting with a spike
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton

## Context

The admin dashboard needs a stacked area chart (one series per Model over 7–90 days, one series highlighted while the rest stay muted, a crosshair synced with a ranked list beside it), trend lines, thin share bars and sparklines in table cells. The client is moving to the TanStack ecosystem (Query, Router, Table).

TanStack Charts reached 1.0 on 2026-10-05. It fits the stacked-area case best: built-in crosshair,
series emphasis, a controlled cursor and selection, CSS-variable theming, small bundles, and chart
scenes that build without a DOM. But it is weeks old, with few contributors and little community
material. shadcn's chart component (Recharts 3) is the mature, shadcn-native alternative, at roughly
twice the bundle cost and with the highlight-and-legend sync wired by hand.

## Decision

1. **Use TanStack Charts (`@tanstack/charts`)**, and its documentation, which ships inside the npm package, is what agents read when writing chart code.
2. **Only the wrapper in `shared/components/charts/` imports it.** The wrapper exposes our own components (`StackedAreaChart`, `TrendChart`, `Sparkline`; `ShareBar` is plain markup) with:
   - one canonical data shape;
   - semantic colour roles, never library colours;
   - controlled `activeSeries` / `hoverIndex` props, so legends live outside the chart;
   - our own tooltip component;
   - height-only sizing, and an accessible label.

   No library types or class names leak into props or tests.

3. **The first ticket is a spike** that builds the real stacked-area chart with its external ranked list. If it fails, the same wrapper is implemented on shadcn chart instead, and this ADR is superseded.

## Consequences

- Swapping libraries later touches one folder.
- Early API churn in TanStack Charts is absorbed by the wrapper.
