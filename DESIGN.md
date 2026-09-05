# Semester OS — Design Direction

> The product's promise is trust: nothing enters your plan until it is checked
> against its source. The design's job is to make that checking visible and
> make the app feel calm, not clever.

**Dials: ENERGY 1 / RHYTHM 2 / MOTION 1**

- ENERGY 1: a utility for stressed students. It says hello quietly. No glows, no gradients, no dark-mode theatrics.
- RHYTHM 2: consistent base with a few deliberate breaks: the home hero, the ledger-style empty states, the sticky approval bar.
- MOTION 1: hover states plus one purposeful animation: extraction stage progress (a 60-second operation must show it is alive).

## Identity motif: the check line

Every extracted item carries a **thin 4px verification bar** whose emerald fill
is proportional to its score, next to a **mono score chip**. This one repeated
gesture IS the product: you can see trust at a glance. It appears on the
approval screen, the course timeline, and the Today digest.

Secondary motif: **mono for numbers**. Scores, weights, dates, and percentages
render in Geist Mono because verification is numeric and numbers should be
scannable against prose. Mono is never used for headings (that would be
terminal cosplay, not identity).

## Palette (R-29: 2 core + 1 accent)

| Token | Value | Purpose |
|---|---|---|
| Ink | stone-900 `#1c1917` | text, headings |
| Paper | white + stone-50 `#fafaf9` | background, cards |
| Emerald 600 `#059669` | accent | primary buttons, verification fill, active nav |
| Emerald 700 `#047857` | accent-text | links and inline accents (5.6:1 on white) |
| Amber 600 / Red 600 | semantic only | needs-review / auto-rejected states. Never decorative. |

Kind chips (deadline, policy, grade component...) are **neutral stone chips**,
not colored pills: the item's shape and section already say what it is; color
is reserved for verification state. Written reason: color elsewhere would
compete with the trust signal.

## Typography

- **Geist Sans** everywhere. Reason: variable, free, native to Next 16,
  engineered for UI legibility at small sizes; zero config drift.
- **Geist Mono** for numerals and dates only (see motif above).
- No uppercase-tracked labels, no mono headings (R-06).

## Shape, elevation, glass

- Radius: `rounded-lg` (8px) for cards, inputs, buttons; `rounded-full` only
  for tiny status dots. Reason: one radius family reads calm; pills everywhere
  read toy (R-11).
- Shadow: flat page. One exception: the sticky bulk-approval bar gets
  `shadow-sm` because it overlays content while scrolling (R-12, one written
  elevation).
- No glassmorphism, no glow, no background grid (R-10, R-13, R-07).

## Theme

Light-only, deliberately (R-21): the product is a document-review surface
used in daylight between classes; a broken half-dark theme is worse than no
theme. The `prefers-color-scheme` override is removed so dark-OS users get
the same designed light UI instead of an accidental broken one.

## Copy voice

Plain, specific, second person, zero em dashes (R-02), zero AI buzzwords
(R-16). CTAs name the action: "Create course", "Upload and extract",
"Approve all 12". Empty states speak like a person and always offer the next
step (R-27).
