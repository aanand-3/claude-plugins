---
version: alpha
name: <Project> — <Direction name>
description: <one line: the feel, for whom>
source: "Wada #<id>"  # palette origin (wada.py roles <id>); "brand" if built from fixed brand colours
colors:
  # paste `wada.py roles <id>` output here (light roles, then dark- roles); shadcn role names
  background: "<#hex>"
  foreground: "<#hex>"
  card: "<#hex>"
  card-foreground: "<#hex>"
  muted: "<#hex>"
  muted-foreground: "<#hex>"
  border: "<#hex>"
  primary: "<#hex>"
  primary-foreground: "<#hex>"
  secondary: "<#hex>"
  secondary-foreground: "<#hex>"
  accent: "<#hex>"
  accent-foreground: "<#hex>"
  destructive: "<#hex>"
  destructive-foreground: "<#hex>"
  ring: "{colors.primary}"
  dark-background: "<#hex>"
  # … every role again with the dark- prefix
typography:
  display:
    fontFamily: <Display face>
    fontWeight: 600
    letterSpacing: -0.02em
  body:
    fontFamily: <Text face>
    fontSize: 16px
    lineHeight: 1.5
  mono:
    fontFamily: <Mono face>
  scale: <1.2 | 1.25 | 1.333>  # sizes: <12, 14, 16, 20, 24, 30, 36>
rounded:
  sm: <4px>
  md: <8px>
  lg: <12px>
spacing:
  base: 4px  # scale: 4 8 12 16 24 32 48 64 96
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: 40px
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: 40px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
---

# <Project> design system

The single home of visual decisions. Read this before building or changing any UI. Code uses tokens, never the raw values above. Change it with `/crew:design refresh`.

## Overview
<Direction name, in 2–4 sentences: the feel, why it suits these users, and how it differs from the competitors' look. Surface: app | marketing | both. Dark mode: yes/no.>

## Colors
<How the roles are used. Primary marks the one main action and the current state. Secondary is for structure and fills. Charts use chart-1…n in order. Status colours always come with an icon or text. Proportion: neutral about 70%, secondary about 20%, accent 10% or less.>

## Typography
<Why this pairing. Scale steps and where each is used (page title, section, body, caption, table). Weights in use. Tabular numerals for data.>

## Layout
<The layout shell every page composes:>
- **Shell:** <nav type and position, page header (title + primary action), content max width, page padding>
- **Breakpoints:** <sm 640 · md 768 · lg 1024 · xl 1280: what changes at each>
- **Rhythm:** <spacing between sections and groups; grid>

## Elevation & Depth
<Borders vs shadows; the (at most two) shadow levels and where they're used; dark-mode surfaces.>

## Shapes
<Radius family and nesting rule; icon set and stroke width.>

## Components
Inventory: compose pages from these. A new composite is added here, with its states, in the same change that introduces it.

| Component | Built from | Variants | States |
|---|---|---|---|
| Button | shadcn `button` | primary, secondary, ghost, destructive | hover, active, focus, disabled, loading |
| <PageHeader> | <shell> | <with/without actions> | — |
| <DataTable> | shadcn `table` | <dense/comfortable> | loading (skeleton), empty, error |

**States:** loading = skeletons shaped like the content; empty = why + next action; error = what happened + retry.

## Do's and Don'ts
- Do <project-specific rule>
- Don't <project-specific tell to avoid, e.g. "gradient text", "emoji icons", "centred body copy">

## Motion
<Durations and easings in use (see design/references/motion.md); the one signature moment, if any; reduced-motion behaviour.>

## Voice
<Tone of UI copy: e.g. plain, specific, sentence case; how errors and empty states speak.>
