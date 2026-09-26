# UI/UX DESIGN SYSTEM — EDU-SHARE

| Field | Value |
| --- | --- |
| **Status** | Proposed design system — awaiting owner approval |
| **Last reviewed** | 2026-09-26 |
| **Scope** | Visual identity, design tokens, components, motion, accessibility baseline, and screen-level UX for the MVP |
| **Token IDs** | `--*` CSS custom properties · `C-nnn` components · `SC-nnn` screens |
| **Related** | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) · [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) · [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) |

> **No component has been built.** No component library has been installed, no CSS
> has been written, and no page exists. Every hex value, size, and duration in this
> document is a **design proposal** to be implemented and then verified.

---

## 1. Purpose and the standard being aimed at

EDU-SHARE must not look like what it is: a student project. It must look like a
product a student would choose over the messaging group they currently use.

The failure mode to avoid is the **generic component-library dashboard** — the
grey-and-blue admin panel with a sidebar, a stat-card row, and a default data
table that every tutorial produces. The second failure mode to avoid is decoration
in place of hierarchy: gradients, glass panels, and animation that make a page feel
busy while making it harder to find a file.

This document defines an identity specific enough that a screenshot of EDU-SHARE is
identifiable, and a system disciplined enough that building the 15 MVP surfaces
does not produce 15 different products.

## 2. Brand identity

### 2.1 Personality

| Trait | Expressed as | Expressed *not* as |
| --- | --- | --- |
| **Scholarly** | Careful typography, ruled structure, precise labels, correct academic vocabulary | Stiffness, formality for its own sake, faux-Latin flourishes |
| **Warm** | A paper-toned canvas, generous spacing, human empty states, plain language | Corporate coldness, sterile white-on-grey |
| **Quietly confident** | One strong accent used sparingly, restraint everywhere else | Shouting with colour, badges and confetti |
| **Dependable** | Predictable placement, honest status, no dead ends | Playfulness that undermines trust |
| **Student-native** | Semester-first language, familiar formats (PDF, DOCX, PPTX), mobile-first reading | Institution-officialdom |

### 2.2 Positioning line

> **"Every subject. Every campus. The notes you actually need."**

### 2.3 The identity motif — "margin and index"

The visual signature of EDU-SHARE is borrowed from the object it replaces: the
**annotated study handout**.

Three concrete, repeatable devices carry it:

1. **The margin rule.** A 3 px accent bar on the leading edge of any card that
   represents a resource, coloured by category. It reads as a highlighter mark in a
   margin and is the single most recognisable element of the interface.
2. **Index tabs.** The taxonomy chain (Institution → Programme → Semester →
   Subject) renders as a row of small, connected, monospaced chips — visually a set
   of index cards — rather than as breadcrumbs or pill badges.
3. **The rule and the hairline.** Section headers sit on a single 1 px rule with a
   generous gap. Structure comes from rules and whitespace, not from boxes and
   shadows.

These devices are cheap to render, scale from mobile to desktop, and are
impossible to confuse with a default dashboard.

### 2.4 Voice and tone

| Situation | Voice |
| --- | --- |
| Navigation and labels | Plain nouns. "Library", "Saved", "Upload". Never "Explore the resources" |
| Empty state | Specific and useful. "No Operating Systems notes for Semester 5 yet. Be the first to add one." Never "No data." |
| Error | What happened, what it affects, what to do next. Never an error code alone |
| Destructive confirmation | Names the thing and its consequence. "Delete *Operating Systems — Unit 3 notes*? This cannot be undone." Never "Are you sure?" |
| Success | Brief and factual. "Uploaded. It is now visible in Semester 5 > Operating Systems." |

## 3. Visual principles

Five principles, each with a test that can fail:

| # | Principle | Test |
| --- | --- | --- |
| P1 | **Content outranks chrome.** A resource title is the most prominent thing on any screen that lists resources. | Remove all colour and shadow: the eye still lands on titles first. |
| P2 | **Structure comes from rules, not boxes.** | No nested card inside a card. Any surface using more than one shadow level is wrong. |
| P3 | **One primary action per view.** | Each screen has exactly one filled-accent button. |
| P4 | **Every state is designed.** | Loading, empty, error, partial, and success exist for every data surface before it ships. |
## 4. Layout, structure and information architecture

### 4.1 Structural philosophy

Academically, everything a student needs is addressed by a **path**: institution →
programme → semester → subject. The interface therefore treats the taxonomy as
navigation, not as a filter panel bolted onto a search page.

The rule:

> **A student should always be able to answer "where am I?" from the index tabs
> alone, without reading a heading.**

### 4.2 The application shell

| Region | Purpose | Behaviour |
| --- | --- | --- |
| Top bar | Identity, global search entry, account menu | Sticky. Height 56 px mobile, 64 px desktop. Contains exactly one primary action |
| Primary navigation | Library · Saved · Upload · Dashboard | Becomes a 5-item bottom tab bar under 768 px. Active item is marked by weight *and* an underline, never by colour alone |
| Content column | The screen itself | Max width 720 px for reading, 1200 px for listings, 1440 px for the admin catalogue |
| Index tabs | Current taxonomy path | Always visible on taxonomy-addressed screens; each segment is a link |
| Footer | Policy links, licence, contact | Present on public screens only |

**Public versus signed-in.** The landing page, resource detail pages, and search
results render **without a shell** (a minimal top bar only) so that shared links
open cleanly for a logged-out reader. The shell appears once the user is
authenticated. This is a deliberate difference from the inherited app, which hid
*everything* behind a login and therefore could never be shared.

### 4.3 Grid and spacing

- 12-column grid; gutters 16 px mobile, 24 px tablet, 32 px desktop.
- Spacing scale — one 4 px base unit, never arbitrary values:
  `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.
- Vertical rhythm between sections is 48 px mobile / 64 px desktop; within a card, 12 px.
- Breakpoints: `360` (minimum supported), `640` (`sm`), `768` (`md`), `1024` (`lg`), `1280` (`xl`), `1536` (`2xl`).
- **Density rule:** listing rows are 72 px tall on desktop and 88 px on mobile
  (larger, because the target is a thumb). Data tables in the admin catalogue may
  use a 44 px compact row — the only place density wins.

### 4.4 Content hierarchy within a listing

In priority order, so that the eye has a route:

1. Resource title (largest text in the row)
2. Category marker (margin rule colour + label)
3. Taxonomy chain (index tabs, small)
4. Contributor and date (muted)
5. File format and size (monospace, muted)
6. Actions: **Open** (primary), Save, More

---

## 5. Typography

### 5.1 Typefaces (all open-source, self-hosted)

| Role | Face | Why | Fallback |
| --- | --- | --- | --- |
| **Display / headings** | **Fraunces** (variable, optical sizing) | A contemporary serif with genuine academic character; instantly distinguishes EDU-SHARE from a utility dashboard | Georgia, serif |
| **Body / interface** | **Inter** (variable) | Neutral, superb at small sizes, tabular figures available | system-ui, sans-serif |
| **Data / metadata** | **JetBrains Mono** | Makes sizes, dates, counts and IDs read as data | ui-monospace, monospace |

Faces are **self-hosted** via the framework's font loader — never a third-party CDN,
which removes the layout shift and the privacy problem in the inherited app.

### 5.2 Type scale

A 1.25 modular ratio, with named steps.

| Token | Size / line-height | Weight | Face | Use |
| --- | --- | --- | --- | --- |
| `--text-display` | 44 / 48 px | 600 | Fraunces | Landing headline only |
| `--text-h1` | 32 / 40 px | 600 | Fraunces | Screen title |
| `--text-h2` | 24 / 32 px | 600 | Fraunces | Section title |
| `--text-h3` | 19 / 28 px | 600 | Inter | Card / row title |
| `--text-body` | 16 / 26 px | 400 | Inter | Default reading size |
| `--text-body-sm` | 14 / 22 px | 400 | Inter | Secondary metadata |
| `--text-caption` | 13 / 18 px | 500 | Inter | Labels, index tabs |
| `--text-micro` | 12 / 16 px | 500 | Inter, uppercase, `0.06em` tracking | Eyebrows and table headers |
| `--text-mono` | 13 / 20 px | 400 | JetBrains Mono | Sizes, dates, counts, IDs |

**Rules.**

- Never more than three type sizes in one card.
- Body text is never smaller than 14 px; 16 px is the default.
- Measure is capped at 68 characters for prose.
- All numeric columns and counts use `font-variant-numeric: tabular-nums`.
## 6. Colour system

> Every hex value below is a **design proposal**. None has been implemented, and none
> has been verified for contrast with a tool. Verification is an `M4` and `M10`
> activity.

### 6.1 Rationale

The inherited application used Tailwind's default palette, which is why it looked
like every other project built from the same tutorial. EDU-SHARE's palette is
**warm paper with ink and brass**: a paper-toned canvas rather than a grey one, a
deep navy for structure and primary action, and a single brass accent reserved for
academic-type signalling. It reads as a university press rather than a SaaS console.

### 6.2 Light theme

| Token | Hex | Intended use |
| --- | --- | --- |
| `--surface-canvas` | `#FAF7F2` | Page background — warm paper, never pure white |
| `--surface-raised` | `#FFFFFF` | Cards, sheets, popovers |
| `--surface-sunken` | `#F2EDE5` | Inset wells, code/metadata blocks, table header rows |
| `--surface-hover` | `#F5F1EA` | Row and list-item hover |
| `--border-hairline` | `#E4DDD1` | Default 1 px rules and dividers |
| `--border-strong` | `#CFC6B6` | Input borders, selected states |
| `--text-primary` | `#17181C` | Body copy, titles |
| `--text-secondary` | `#555C68` | Metadata, captions |
| `--text-tertiary` | `#7C8492` | Placeholders, disabled |
| `--text-inverse` | `#FBF9F5` | Text on brand/danger fills |
| `--brand-solid` | `#1D3B5C` | Primary button fill, active nav, links |
| `--brand-hover` | `#16304C` | Primary button hover/active |
| `--brand-tint` | `#E7EDF5` | Selected row, subtle brand wash |
| `--accent-solid` | `#A85E1B` | Brass accent — category marks, callouts, focus emphasis |
| `--accent-tint` | `#F6E9DA` | Accent background wash |
| `--focus-ring` | `#1D6FB8` | 2 px focus outline, offset 2 px |

### 6.3 Dark theme

| Token | Hex | Note |
| --- | --- | --- |
| `--surface-canvas` | `#101216` | Not pure black — reduces halation on OLED and keeps borders readable |
| `--surface-raised` | `#171A20` | |
| `--surface-sunken` | `#0B0D11` | |
| `--surface-hover` | `#1F242C` | |
| `--border-hairline` | `#262B34` | |
| `--border-strong` | `#3A424E` | |
| `--text-primary` | `#ECE9E3` | Warm off-white, preserving the paper family |
| `--text-secondary` | `#A7AEBA` | |
| `--text-tertiary` | `#7C8593` | |
| `--brand-solid` | `#6FA3DE` | Lightened so it reads on dark canvas |
| `--accent-solid` | `#E0A458` | |
| `--focus-ring` | `#8CC0F0` | |

### 6.4 Status colours

| Meaning | Light | Dark | Use |
| --- | --- | --- | --- |
| Success | `#176B45` | `#4FBF87` | Upload complete, saved |
| Warning | `#9A5B00` | `#E0A458` | Approaching quota, pending review |
| Danger | `#A32B2B` | `#E58080` | Destructive actions, errors |
| Info | `#1D3B5C` | `#6FA3DE` | Neutral informational notices |

### 6.5 Category colours (the margin rule)

Each resource category owns one colour, used **only** on the 3 px margin rule and its
label dot. It is never used as a button fill or a link colour, so it never competes
with the brand.

| Category | Light | Dark |
| --- | --- | --- |
| Lecture notes | `#1D3B5C` | `#6FA3DE` |
| Previous-year papers | `#A85E1B` | `#E0A458` |
| Assignments | `#1F6B57` | `#5FC2A4` |
| Lab manuals | `#6B4E9E` | `#A78BE0` |
| Reference material | `#455568` | `#8C9AAD` |
| Study guides | `#A03A6B` | `#E084AC` |
| Practice questions | `#0F6B8A` | `#63B8D6` |

### 6.6 Colour rules

1. **Colour is never the only signal.** Category, status, and validation all carry a
   text label or an icon shape in addition to colour, so the interface survives
   greyscale printing and the most common forms of colour-vision deficiency.
2. **One accent per screen.** The brass accent marks the current category and, at
   most, one callout. Two accents on one screen is a defect.
3. **No gradients.** The inherited landing page used one; the identity does not need
   it, and it is the single fastest way to look generic.
4. **Contrast targets** — body text ≥ 4.5:1 (aim 7:1), large text ≥ 3:1, interactive
   borders and focus indicators ≥ 3:1. Every pairing is verified against WCAG 2.2 AA
   in `M4` with a tool, and again in `M10`. Nothing is claimed as compliant yet.
5. **Semantic tokens only.** Components reference `--surface-*`, `--text-*`,
   `--border-*`, `--brand-*`, `--accent-*`, `--status-*`. A hex value in a component
## 7. Surfaces, elevation, borders and radii

### 7.1 Elevation

| Token | Value (light) | Use |
| --- | --- | --- |
| `--elevation-0` | none | Everything in the document flow — listings, forms, cards |
| `--elevation-1` | `0 1px 2px rgb(23 24 28 / 0.06)` | Row hover, sticky top bar at scroll |
| `--elevation-2` | `0 4px 12px rgb(23 24 28 / 0.08)` | Dropdown, combobox popup, toast |
| `--elevation-3` | `0 12px 32px rgb(23 24 28 / 0.12)` | Dialog and sheet |

**The rule.** Elevation is a statement of *interactivity or layering*, never
decoration. A card on a page is `--elevation-0` with a hairline border; if a card has
a shadow and nothing else does, the shadow is saying something that is not true.

In the dark theme shadows are nearly invisible, so elevation is expressed by
**surface lightness plus a hairline border** instead. Both themes ship the same
component structure, so this is a token-level difference only.

### 7.2 Borders

| Token | Value | Use |
| --- | --- | --- |
| `--border-hairline` | 1 px `#E4DDD1` | Dividers, card edges, table rules |
| `--border-strong` | 1 px `#CFC6B6` | Input edges, selected states |
| `--border-focus` | 2 px `--focus-ring`, 2 px offset | Keyboard focus, on every interactive element |
| `--border-margin-rule` | 3 px, category colour | The identity device, on resource cards only |

A 2 px border means exactly one thing: **focus**. Nothing else uses 2 px.

### 7.3 Radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | 4 px | Badges, index-tab chips |
| `--radius-sm` | 6 px | Inputs inside groups, small buttons |
| `--radius-md` | 10 px | Buttons, inputs, selects — the default |
| `--radius-lg` | 14 px | Cards, panels, dialogs |
| `--radius-xl` | 20 px | Bottom sheet, mobile full-bleed panels |
| `--radius-pill` | 999 px | Avatar, count pill only |

Radii stay in the 4–14 px band deliberately. Fully rounded everything is the
signature of the generic component library this design is avoiding.

### 7.4 What is banned

No glassmorphism, no `backdrop-filter` blur, no neon glows, no gradients as
backgrounds, no decorative patterns, and no more than one accent per screen. Each is
banned because it competes with the content, which principle **P1** says wins.

---

## 8. Iconography, imagery and illustration

### 8.1 Icons

| Decision | Value |
| --- | --- |
| Family | **Lucide** — one family only, never mixed with a second (the inherited app used Font Awesome icons ad hoc) |
| Stroke | 1.5 px, `currentColor` |
| Sizes | 16 px inline, 20 px in buttons, 24 px in nav, 32 px in empty states |
| Meaning | Icon + label by default. An icon may stand alone **only** when it has an `aria-label` and a tooltip, and only for a universally understood action |
| Forbidden | Icons as decoration, icons in every heading, icons that mean "generic thing" |

### 8.2 File-type marks

Each accepted format gets a deterministic glyph and a short uppercase label
(`PDF`, `DOCX`, `PPTX`, `XLSX`, `TXT`). The mark is **neutral-coloured** — it
describes the file, so it must not be confused with the category colour on the
margin rule.

### 8.3 Institution identity

There is no logo upload in v1. An institution is identified by a **monogram avatar**:
its initials in the display face, on a deterministic tint derived from the
institution's slug, rendered at 24, 32 and 48 px. It is stable across sessions,
cheap, and reads as an institutional crest rather than a placeholder.

### 8.4 Illustration

There is no stock photography and no illustration of people. Empty states use
**drawn-geometry "index card" motifs** in the category colour — a small set of three
or four reusable SVG shapes, roughly 1–2 KB each. This keeps character without
adding the weight, licensing, or genericism of a stock illustration set.

---

## 9. Motion language

### 9.1 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--motion-instant` | 80 ms | Focus ring, checkbox tick, toggle |
| `--motion-quick` | 140 ms | Hover and press feedback, tooltip |
| `--motion-base` | 220 ms | Content entering, disclosure expanding, toast |
| `--motion-slow` | 320 ms | Sheet and dialog transitions, theme change cross-fade |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Things arriving |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving — exits are always faster than entries |

### 9.2 What motion is allowed to do

| Motion | Where | Why it earns its place |
| --- | --- | --- |
| Fade + 4 px rise | A list or panel entering | Shows that content arrived, not that the page reloaded |
| Height + opacity | Disclosure expanding (filters, metadata) | Preserves the reader's position in a long list |
| Cross-fade | Theme change | Prevents a jarring flash |
| Directional slide | Sheet opening from the edge it belongs to | Says where it came from, so where to send it back |
| Optimistic state flip | Save toggle | Makes a one-click action feel instant, with rollback on failure |
| Determinate progress bar | Upload | Tells the truth about a slow operation instead of hiding it behind a spinner |

### 9.3 What motion is forbidden

| Forbidden | Reason |
| --- | --- |
| Page-transition wipes, slides, or curtain effects | Delay reading to decorate navigation |
| Parallax, autoplaying loops, bouncing, or pulsing | Attention theft |
| Animate-on-scroll that withholds content until the reader arrives | Content becomes conditional on an animation having run |
| Indeterminate spinners as the only upload feedback | Conveys nothing about progress or failure |
| Animating layout properties such as `width` or `top` | Causes jank on the low-end phones PR-01 actually uses |

### 9.4 Reduced motion

`prefers-reduced-motion: reduce` is honoured at the token level, not per component:

- All transform-based motion degrades to **opacity only**.
- Skeleton shimmer becomes a static tinted block.
- Non-essential durations collapse to `0 ms`; nothing that conveys state is removed.
- **Nothing becomes unreachable or invisible** — reduced motion changes how content
  appears, never whether it appears.

---

## 10. Responsive behaviour

The primary context is a phone on a slow connection at night (persona PR-01), so
mobile is the design target and desktop is the enhancement — not the reverse.

### 10.1 Structural adaptations

| Element | Mobile (< 768 px) | Desktop (≥ 1024 px) |
| --- | --- | --- |
| Primary navigation | Bottom tab bar, 5 items, `env(safe-area-inset-bottom)` aware | Top bar, inline links with an active underline |
| Index tabs | Horizontally scrollable with an edge fade; current item scrolled into view | Fully visible on one line |
| Resource listing | Stacked cards, 88 px minimum row, actions in an overflow sheet | Row layout with visible primary action and a hover reveal for secondary ones |
| Filters | Full-height sheet triggered by a "Filters" button showing an active count | Persistent sidebar |
| Metadata tables | Definition list | Table |
| Right-hand panels | Pushed to the bottom, or a sheet | Side by side |

### 10.2 Touch and input

- Minimum touch target 44 × 44 px, which exceeds the WCAG 2.2 minimum of 24 × 24 px.
- Every hover-revealed affordance has a **tap equivalent**; nothing important is
  hover-only.
- The upload target is a full-width button on touch devices, not a drag-only zone.
- Text inputs use suitable `inputmode` and `autocomplete` attributes; email and
  password fields are autofill-compatible.

### 10.3 Performance budget **[TARGET]**

These are objectives to test against in `M10`, not measurements taken so far.

| Metric | Target | Why |
| --- | --- | --- |
| Page weight of a listing screen (compressed, excluding the opened document) | < 200 KB | Mobile data |
| Interaction-ready on a mid-tier phone over simulated 4G | < 2.5 s | PR-01 abandons rather than waits |
| Cumulative layout shift | < 0.1 | Self-hosted fonts and reserved space for skeletons |
| Search results render | < 500 ms server time at MVP corpus size | Feels immediate |
| Largest contentful paint | < 2.5 s | Same as above |

### 10.4 Graceful degradation

- Skeletons mirror the final layout, so nothing jumps when data arrives.
- A failed fetch shows an inline retry, never a blank region and never a full-page
  loader.
- No content is dependent on JavaScript for its *existence* — public resource pages
  are server-rendered and readable with scripting unavailable.
- Layout is usable from 320 px upward, with 360 px as the tested minimum.

---

## 11. Component inventory — foundations, form and navigation

Every component is specified once, here, and assembled per screen in §12. States are
named explicitly, because a component without a defined empty, loading and error state
is the most common cause of an unfinished interface.

**Conventions.** Text is provided by the caller and never constructed inside the
component. A component may accept a layout escape hatch, but never a colour or size
override — those come from tokens.

### 11.1 Foundations

| ID | Component | States | Accessibility |
| --- | --- | --- | --- |
| C-001 | `Text` | variant, tone, truncate | Correct semantic element; `tabular-nums` where numeric |
| C-002 | `Heading` | levels 1–4 | Real `<h1>`–`<h4>`; visual size is independent of level, so structure is never faked |
| C-003 | `Stack` / `Inline` | gap token | Layout only |
| C-004 | `Divider` | — | Decorative rule; never the only carrier of meaning |
| C-005 | `Surface` | elevation 0–3, tone | Renders the correct background from tokens |
| C-006 | `Card` | default, interactive, selected | The interactive form is a real link or button, not a `div` with a click handler |
| C-007 | `Icon` | size, tone | `aria-hidden` unless it is the only label, in which case the parent supplies `aria-label` |

### 11.2 Form and input

| ID | Component | States | Accessibility |
| --- | --- | --- | --- |
| C-010 | `Field` | default, required, error, hint, disabled | Wires `id`, `for`, `aria-describedby`, `aria-invalid`, `aria-required`; errors are **announced**, not merely coloured |
| C-011 | `TextInput` | default, focus, filled, error, disabled, read-only | Autofill-compatible; correct `inputmode` |
| C-012 | `Textarea` | as above, plus auto-grow | — |
| C-013 | `Select` | default, open, error, disabled | Native element by preference; a custom control only if the native one cannot be styled sufficiently |
| C-014 | `Combobox` | default, open, filtering, no-results, error, loading | Full keyboard operation; listbox semantics with active-descendant; announces the result count |
| C-015 | `Checkbox` / `RadioGroup` | checked, indeterminate, focus, error, disabled | Native inputs; the group carries a fieldset and legend |
| C-016 | `Form` | idle, submitting, invalid, succeeded, failed | Request-forgery handling lives **here only** (rule `S4`); the submitting state is announced; double submission is prevented |
| C-017 | `FilePicker` | empty, chosen, too-large, wrong-type, uploading, done, failed | A native file input beneath a button; drag-and-drop is an enhancement, never the only route |
| C-018 | `SearchInput` | idle, typing, results, no-results, error | Searchbox semantics; suggestions are keyboard-reachable |

### 11.3 Navigation

| ID | Component | States | Accessibility |
| --- | --- | --- | --- |
| C-020 | `TopBar` | transparent, scrolled | `role="banner"` |
| C-021 | `PrimaryNav` | item inactive, active, disabled | Active state marked by weight **and** underline, never colour alone; `aria-current="page"` |
| C-022 | `TabBar` | as above; mobile only | `aria-current`; safe-area aware |
| C-023 | `IndexTabs` | segment, current, truncated | An ordered list of links; the current segment carries `aria-current`; horizontal scroll with a visible edge affordance |
| C-024 | `Breadcrumb` | — | Used only where index tabs are inappropriate (admin) |
| C-025 | `Pagination` | idle, loading, first page, last page | Keyset-based; announces "page 2 of 7" |
| C-026 | `SkipLink` | hidden until focused | The first focusable element on every page |

---

## 12. Component inventory — data display, feedback and domain

### 12.1 Data display

| ID | Component | States | Accessibility |
| --- | --- | --- | --- |
| C-030 | `ResourceRow` | default, hover, focus, saved, hidden-by-moderation, loading, skeleton | The title is the primary link; the whole row is **not** one giant click target; the margin rule carries the category, with a text label beside it |
| C-031 | `ResourceGrid` | populated, empty, loading, error, partial | The empty state is specific and actionable |
| C-032 | `MetadataList` | default, compact | A real description list where it is genuinely a definition list |
| C-033 | `CategoryMark` | 7 category values | Colour **plus** an always-present text label |
| C-034 | `FileTypeMark` | PDF, DOCX, PPTX, XLSX, TXT | Neutral colour; carries a text label |
| C-035 | `InstitutionMark` | sizes 24 / 32 / 48 | Deterministic monogram; the accessible name is the institution name |
| C-036 | `CountPill` | value, zero, capped | `tabular-nums`; an `aria-label` such as "12 saved resources" |
| C-037 | `FilterBar` | empty, active (n), sheet trigger, desktop inline | The active filter count is announced; removing one filter is one action |
| C-038 | `StatBlock` | value, delta, loading | Numbers are always labelled, never bare |
| C-039 | `DataTable` | populated, empty, loading, error, sorted | Real table semantics, `scope` on headers; admin screens only |

### 12.2 Feedback and overlays

| ID | Component | States | Accessibility |
| --- | --- | --- | --- |
| C-040 | `Skeleton` | line, block, row | `aria-hidden`; the containing region carries `aria-busy` |
| C-041 | `EmptyState` | first use, no results, no permission, error | Exactly one clear action; the illustration is `aria-hidden` |
| C-042 | `ErrorState` | recoverable, fatal | Says what failed and what to do next; never a raw error or a bare code |
| C-043 | `Toast` | info, success, warning, danger; dismiss | `role="status"` for information, `role="alert"` for failure; auto-dismiss pauses on hover and on focus; never the only record of a failure |
| C-044 | `Dialog` | open, closing, confirm, destructive | Focus trapped and restored; `Esc` closes; the title is the accessible name; destructive dialogs name the object **and** the consequence |
| C-045 | `Sheet` | open, closing, scrollable | Used for filters and mobile actions; the same focus rules as `Dialog` |
| C-046 | `ConfirmInline` | idle, confirming | Preferred over a dialog for reversible actions inside a list |
| C-047 | `ProgressBar` | determinate, indeterminate, stalled, failed | Progressbar semantics with a value; upload never shows a bare spinner |
| C-048 | `Banner` | info, warning, danger | Page-level notices such as "your account is not yet verified" |

### 12.3 Domain components

| ID | Component | States | Notes |
| --- | --- | --- | --- |
| C-050 | `TaxonomyPicker` | 5 levels, loading, empty, filtered | The full cascade is **one** component, because it appears on browse, on upload and in admin |
| C-051 | `UploadDropzone` | idle, dragging, chosen, validating, uploading, done, failed | States the limits **before** the user starts, and lists accepted formats as text |
| C-052 | `SaveButton` | unsaved, saved, pending, failed | Optimistic with rollback; the accessible name includes the resource title |
| C-053 | `ReportForm` | closed, open, submitting, submitted, error | The reason is a required controlled choice, with optional free-text detail |
| C-054 | `ModerationCard` | pending, resolved, dismissed, escalated | Shows the reason, the resource and the contributor's history in one view — PR-04's whole job |
| C-055 | `AuditTrail` | populated, empty, loading | Read-only; admin only |
| C-056 | `QuotaMeter` | normal, warning, exceeded | Visible to a contributor approaching their limit and to the owner |

---

## 13. Screen specifications

### 13.0 The state contract (defined once, applied to every screen)

Every screen below inherits these, so they are written here rather than repeated
fifteen times. A screen that deviates must say so explicitly.

| State | Rule |
| --- | --- |
| **Loading** | Skeleton blocks mirroring the final layout, inside a region marked `aria-busy`. Never a full-page spinner, never a blank screen |
| **Empty (first use)** | Says what this screen will contain and offers **one** action that fills it. Never "No data" |
| **Empty (no results)** | Names the filters that produced nothing and offers one click to relax them |
| **Empty (no permission)** | Explains that this is not available to this account, without implying the content does not exist — *except* for private resources, where "not found" is deliberate |
| **Error** | Inline, next to the thing that failed, naming it and offering a retry. The rest of the page stays usable |
| **Success** | Brief and factual; states what changed and where the result now lives |
| **Partial** | Rendered as data arrives. No section is withheld because a later one is slow |

**One deliberate exception:** submissions that change state (publish, delete, moderate)
are **never** reported as successful optimistically. Optimism is used only for
reversible toggles such as saving.

### SC-01 — Public landing page

| Field | Specification |
| --- | --- |
| **Primary goal (PR-01)** | Decide within eight seconds that this site has their material, and start looking |
| **Layout** | No application shell. A full-bleed hero (≤ 480 px tall) → a taxonomy picker seeded with the most-populated institutions → three recently published resources → "how it works" in three steps → a policy and attribution footer |
| **Components** | `C-050` TaxonomyPicker, `C-030` ResourceRow ×3, `C-031`, `C-020` minimal TopBar, `C-018` search entry |
| **Primary action** | Pick an institution and start browsing |
| **Secondary** | Search directly; sign in; register; read the policy pages |
| **Loading** | The hero is static and paints immediately; only the resource strip uses skeletons |
| **Empty** | If the platform holds no resources yet, the hero says what is coming and offers registration instead of an empty strip |
| **Error** | If recent resources fail to load, the strip is omitted **silently** rather than shown broken — the taxonomy picker still works |
| **Success** | Not applicable |
| **Responsive** | Hero shortens to 320 px; the picker becomes two stacked selects; the resource strip becomes a vertical list |
| **Accessibility** | Exactly one `<h1>`; no text is baked into an image; the taxonomy picker is fully keyboard-operable; the skip link is the first focusable element |

### SC-02 — Authentication and account recovery

| Field | Specification |
| --- | --- |
| **Primary goal** | Get in — or get back in — with minimum friction and maximum confidence |
| **Layout** | Centred single-column card, max width 400 px, on the canvas surface. No app shell, no decorative imagery |
| **Components** | `C-016` Form, `C-011`, `C-010`, `C-048` Banner for a "check your email" notice, `C-044` Dialog for the reset confirmation |
| **Primary action** | Sign in / register / send reset link — one per variant |
| **Secondary** | Switch between sign-in and register; resend verification |
| **Loading** | The submit button enters a pending state and disables; the form is never cleared |
| **Empty** | Not applicable |
| **Error** | Field-level for validation; a single generic message for credential failure, **deliberately not distinguishing an unknown address from a wrong password** |
| **Success** | Redirect to the intended destination, plus a welcome banner on first sign-in |
| **Responsive** | Identical layout; inputs sized for thumbs; the vertical keyboard safe area is respected |
| **Accessibility** | Labels are always visible, never placeholder-only; errors are announced; autocomplete attributes are set so password managers work; the form completes with a screen reader end to end |

### SC-03 — Student onboarding

| Field | Specification |
| --- | --- |
| **Primary goal** | Attach the new account to a real taxonomy path, so uploads and browsing are prefilled from then on |
| **Layout** | Three steps in one screen as a single progressive form: institution → programme and semester → subject interests. A skip option is present and honest about its consequence |
| **Components** | `C-050` TaxonomyPicker, `C-016`, `C-047` ProgressBar, `C-048` |
| **Primary action** | Save my academic context |
| **Secondary** | Skip for now; search for my institution if it is missing |
| **Loading** | Each level loads its options when the parent is chosen, with `C-014` Combobox filtering |
| **Empty** | If the institution is missing, the screen offers the **request-an-institution** flow (FR-TAX-09) instead of a dead end |
| **Error** | If a level fails to load, that step shows an inline retry and the earlier choices are preserved |
| **Success** | A short confirmation naming what was saved and what it changes |
| **Responsive** | Steps stack vertically; the combobox opens as a full-height sheet |
| **Accessibility** | Each step is a `fieldset` with a legend; step completion is announced; skipping is a real button, not a hidden link |

### SC-04 — Main dashboard

| Field | Specification |
| --- | --- |
| **Primary goal** | Answer "what should I do next?" for a returning user, and show that contributions are being used |
| **Layout** | Greeting with the user's current taxonomy context → three `StatBlock`s (published, saved, downloads received) → "continue where you left off" row of recently viewed resources → a compact activity list → one prominent upload call to action |
| **Components** | `C-038`, `C-030`, `C-036`, `C-056` QuotaMeter, `C-048` Banner when unverified, `C-040` skeletons |
| **Primary action** | Upload a resource |
| **Secondary** | Open the library; manage contributions; complete verification |
| **Loading** | Stats and lists render as skeletons independently, so a slow stat query does not block the rest |
| **Empty (new user)** | Replaced by an onboarding panel: "You haven't published anything yet — here is what that looks like", with a sample of what a resource page contains |
| **Error** | Per-block retry. A failing stats query never hides the lists |
| **Success** | A resource published in this session appears at the top of the activity list with a link to it |
| **Responsive** | Stats become a single horizontal scroll row of two visible cards; "continue" becomes a vertical list |
| **Accessibility** | Stats have text labels, not bare numbers; the vertical order is the reading order; a live region announces a completed upload |

### SC-05 — Institution discovery and selection

| Field | Specification |
| --- | --- |
| **Primary goal** | Get from "I know my college" to its programme list in one step |
| **Layout** | Search field pinned at the top → alphabet-grouped list of institutions with monogram, short name and resource count → recently viewed institutions → a request-a-missing-institution link at the bottom |
| **Components** | `C-018`, `C-035` InstitutionMark, `C-036`, `C-041` EmptyState, `C-025` Pagination/browse |
| **Primary action** | Select an institution |
| **Secondary** | Search; request a missing institution |
| **Loading** | The list is alphabetical and paginates; the first page renders as skeletons sized to the final rows |
| **Empty (no match)** | "No institution matches *X*. You can request it." — with the request form one click away |
| **Empty (no institutions at all)** | An honest pre-launch state explaining that the catalogue is being seeded |
| **Error** | Inline retry above the list; the search field keeps its value |
| **Success** | Immediate navigation to the institution page |
| **Responsive** | Full-width rows; the alphabet index becomes a sticky letter header; the request link becomes a full-width secondary button |
| **Accessibility** | The list is a real list of links; result count is announced as the query changes (debounced); letter headings are real headings |

### SC-06 — Programme, semester and subject browsing

| Field | Specification |
| --- | --- |
| **Primary goal** | Reach a subject page that already answers "what is here?" |
| **Layout** | Index tabs showing the current path → a grid of programmes (or semesters, or subjects at the final level) each with its resource count → a right-hand "popular in this institution" panel on desktop → a filter bar |
| **Components** | `C-023` IndexTabs, `C-006` Card, `C-036`, `C-037` FilterBar, `C-031`, `C-030` |
| **Primary action** | Select the next level down |
| **Secondary** | Apply a filter; sort; open a resource directly from this level |
| **Loading** | Counts load a fraction later than names, and appear as a small skeleton rather than blocking the card |
| **Empty (no resources at this level)** | "No resources for Semester 5 yet. Add the first one." with an upload link that **prefills the entire taxonomy path** — the single most valuable empty state in the product |
| **Error** | The taxonomy level renders from cache where possible; a count failure degrades to no count rather than an error |
| **Success** | Not applicable |
| **Responsive** | Cards become a single-column list; index tabs scroll horizontally; the popular panel moves below the list |
| **Accessibility** | Index tabs are an ordered list of links with `aria-current`; cards are not nested interactive elements; counts carry accessible labels |

### SC-07 — Resource listing and search results

| Field | Specification |
| --- | --- |
| **Primary goal (PR-01)** | Recognise, on one screen, a resource that matches what they need right now |
| **Layout** | Search field with the active query → filter bar summarising active filters → result count → a list of `ResourceRow`s → keyset pagination with an explicit "load more" |
| **Components** | `C-018`, `C-037`, `C-030`, `C-036`, `C-025`, `C-031`, `C-041` |
| **Primary action** | Open a resource |
| **Secondary** | Save; refine or clear filters; change sort |
| **Loading** | Rows appear as skeletons matching the final row height, so the count does not jump when data lands |
| **Empty (no results)** | Names the query **and** the active filters, and offers both "clear filters" and a browse-instead link. It must never be the anonymous "No materials found" of the inherited app |
| **Error** | The query and filters are preserved and a retry is offered inline; a partial failure still renders whatever results arrived |
| **Success** | Not applicable — a read surface |
| **Responsive** | Rows become cards with the primary action attached; filters move into a sheet showing the active count |
| **Accessibility** | The result count is announced after each search; `aria-busy` on the list region; focus stays in the search field after a debounced search; each row's save control has a distinct accessible name |

### SC-08 — Resource detail and preview

| Field | Specification |
| --- | --- |
| **Primary goal** | Decide whether this file is what they need, then get it — without signing in when the resource is public |
| **Layout** | Title → index tabs of the full taxonomy path → contributor and date → a preview panel (a rendered first page for a PDF where feasible, otherwise a file summary card) → a metadata definition list → actions. A "more in this subject" list follows |
| **Components** | `C-023`, `C-032`, `C-034`, `C-033`, `C-052` SaveButton, `C-053` ReportForm, `C-036` |
| **Primary action** | **Open** in a viewer or a new tab; **Download** is secondary, because opening is what a student wants mid-revision |
| **Secondary** | Save; download; report; view the contributor; view other resources in the same subject |
| **Loading** | Metadata renders first from the server; the preview is a reserved-size skeleton so nothing shifts when it loads |
| **Empty** | Not applicable. If the resource is hidden or private and the viewer is not entitled, the page **is a 404** — never a permission message that confirms existence |
| **Error** | If the preview cannot be generated, metadata and actions still work and the preview panel says so plainly |
| **Success** | Save toggles optimistically with a rollback on failure; a submitted report shows a confirmation and the resulting status |
| **Responsive** | The preview moves below the title and metadata; actions become a sticky bottom bar; the related list moves last |
| **Accessibility** | Heading order reflects the real structure; the preview is a viewer with an accessible fallback link; the download control names the format and size; the report dialog is fully keyboard-operable |

### SC-09 — Resource upload workflow

| Field | Specification |
| --- | --- |
| **Primary goal (PR-02)** | Publish a document with complete metadata in under three minutes |
| **Layout** | One screen, two columns on desktop: the file dropzone on the left, a short metadata form on the right (title, description, category, taxonomy path, semester, visibility). Limits are stated **above** the dropzone, never revealed only on rejection |
| **Components** | `C-051` UploadDropzone, `C-050` TaxonomyPicker, `C-016`, `C-010`, `C-047` ProgressBar, `C-048` |
| **Primary action** | Publish |
| **Secondary** | Replace the chosen file; cancel and discard; (post-MVP) save as draft |
| **Loading** | Three honest phases: choosing (instant), transferring (determinate progress with size and an estimate), verifying (server inspection, with a short explanatory label). **Never a bare spinner** |
| **Empty** | The dropzone *is* the empty state, and it lists the accepted formats and the maximum size as text |
| **Error** | Per-field for metadata; **per-file for the file itself**, naming the specific reason — too large, format not accepted, content does not match its extension — each with a replacement affordance |
| **Success** | Names the resource and its full taxonomy path, links straight to the published page, and offers "add another" |
| **Responsive** | Single column, file first; the dropzone becomes a full-width button while drag-and-drop remains available |
| **Accessibility** | The file input is a real input with a visible label; progress is announced through a progressbar role with a value; errors are announced and focus moves to the first invalid field; the submit control is disabled only while a request is genuinely in flight |

### SC-10 — User profile

| Field | Specification |
| --- | --- |
| **Primary goal** | Establish that a contributor is a real person in a real programme, without exposing their personal data |
| **Layout** | Display name and monogram, institution and programme (public) → two views: Published and Saved (Saved visible only to the owner) → edit affordances for the owner only |
| **Components** | `C-035`, `C-023` or a link pair, `C-030`, `C-038`, `C-048` |
| **Primary action** | Browse this contributor's published resources |
| **Secondary** | Edit profile (owner only); report a resource (never the profile) |
| **Loading** | The header renders from the server; the content area uses skeletons |
| **Empty** | "No published resources yet" for a viewer, and a direct "publish your first resource" action for the owner |
| **Error** | Inline retry per view; the header never disappears |
| **Success** | A profile edit confirms and is reflected in the header immediately |
| **Responsive** | The two views become a segmented control; stats collapse into one row |
| **Accessibility** | Tabs follow the tab pattern properly with roles and arrow-key support, **or** are replaced by links if the pattern cannot be implemented correctly; the monogram is not announced twice |

### SC-11 — Personal library and saved resources

| Field | Specification |
| --- | --- |
| **Primary goal (PR-03)** | Return to something saved earlier and still know why it is worth opening |
| **Layout** | A header with the saved count → a filter bar (subject, programme, category, format) → the list of saved resources with the date saved shown → group-by-subject toggle |
| **Components** | `C-037`, `C-030`, `C-036`, `C-052` SaveButton in its saved state, `C-041`, `C-025` |
| **Primary action** | Open a saved resource |
| **Secondary** | Unsave (with undo); filter; group by subject |
| **Loading** | Skeletons sized to the final rows; the count appears once known rather than animating from zero |
| **Empty (never saved anything)** | "Nothing saved yet. Use the save button on any resource — it is the bookmark icon in every list." This names the exact control, because the empty state's whole job is to teach it |
| **Error** | Inline retry; filters and sort are preserved |
| **Success** | Unsaving removes the row immediately and shows an undo affordance for a few seconds |
| **Responsive** | Rows become cards; the filter bar becomes a sheet; the group toggle becomes a segmented control |
| **Accessibility** | The count and the group headings are announced; unsave-then-undo is operable by keyboard without the row moving under focus; each unsave control names its resource |

### SC-12 — Contribution history

| Field | Specification |
| --- | --- |
| **Primary goal (PR-02)** | See what has been published, how it is performing, and fix anything wrong |
| **Layout** | A summary row (published, total downloads, total saves) → a list of the user's resources, newest first, each showing status (live, hidden, processing) and a row of actions → an inline note explaining any moderation decision |
| **Components** | `C-039` as a list on mobile and a table on desktop, `C-036`, `C-048` for a moderation notice, `C-046` ConfirmInline, `C-041` |
| **Primary action** | Edit a resource |
| **Secondary** | Replace its file; delete it; open it as others see it; read the moderation reason |
| **Loading** | Skeleton rows sized to the final layout |
| **Empty** | "You haven't published anything yet" with an upload call to action and a one-line explanation of what counts as a good contribution |
| **Error** | Inline retry; a failed delete or edit reports the specific failure and reverts any optimistic change |
| **Success** | Editing a resource confirms and updates the row in place |
| **Responsive** | The table becomes a list of cards; actions move into an overflow sheet |
| **Accessibility** | A real table on desktop with `scope`d headers; status is conveyed by text, not by a coloured dot alone; destructive actions are labelled with the resource name |

### SC-13 — Reporting and moderation

| Field | Specification |
| --- | --- |
| **Primary goal (PR-04)** | Decide about one resource quickly, act once, and be able to undo it |
| **Layout** | A queue list ordered oldest-first, each entry a `ModerationCard` showing the resource, its metadata, the report reason, and the contributor's history → a detail view with full context and the available actions |
| **Components** | `C-054` ModerationCard, `C-044` Dialog (reason required), `C-043` Toast, `C-055` AuditTrail, `C-041` |
| **Primary action** | Hide the resource |
| **Secondary** | Dismiss the report; restore; restrict the contributor; open the resource as a visitor sees it; open the audit trail |
| **Loading** | Skeleton cards; the contributor's history loads independently and shows its own skeleton |
| **Empty** | "Nothing to review. Reports you action will be recorded in the audit trail" — with a link to that trail, so the screen is never a dead end |
| **Error** | A failed action reports which action failed and leaves the item in the queue rather than removing it optimistically |
| **Success** | The card leaves the queue and a toast confirms **and** offers undo, because the queue is where mistakes are made |
| **Responsive** | Cards stack; the reason dialog becomes a full-height sheet with a sticky confirm bar |
| **Accessibility** | The reason is a required radio group inside a fieldset; the action is described by the resource name; the dialog takes and restores focus; the toast is announced but never the only confirmation |

**Deliberate omission.** The reporting form is a component on SC-08, not a separate
screen, because making a report cost a page navigation is how moderation queues end up
empty.

### SC-14 — Settings

| Field | Specification |
| --- | --- |
| **Primary goal** | Change the few things worth changing and leave |
| **Layout** | Grouped sections in one page: Account (email, password), Academic context, Preferences (theme, default visibility), Danger zone (deactivate or delete) |
| **Components** | `C-016`, `C-010`, `C-011`, `C-050`, `C-044` for destructive confirmations, `C-048` |
| **Primary action** | Save the section being edited (per-section, not one page-wide save) |
| **Secondary** | Change password; resend verification; sign out everywhere (post-MVP); deactivate |
| **Loading** | Sections render independently; each save shows its own pending state |
| **Empty** | Not applicable |
| **Error** | Field-level for validation; a section-level message if the save fails, with the user's input preserved |
| **Success** | Per-section confirmation naming what changed |
| **Responsive** | Sections stack; the danger zone stays clearly separated and is never adjacent to an innocuous control |
| **Accessibility** | Each section is a landmark with a heading; the theme control is operable by keyboard and announces the new value; destructive confirmations name the account and the consequence |

### SC-15 — Responsive mobile navigation

| Field | Specification |
| --- | --- |
| **Primary goal** | Make the five destinations reachable with one thumb, without covering content |
| **Layout** | Under 768 px, primary navigation becomes a fixed bottom tab bar of five items: Library · Search · Upload (centre, visually emphasised) · Saved · Dashboard. The top bar keeps only the wordmark, contextual back navigation and the account menu |
| **Components** | `C-022` TabBar, `C-020` TopBar, `C-045` Sheet for the account menu |
| **Primary action** | Upload — the centre item |
| **Secondary** | Account menu: profile, settings, sign out |
| **Loading** | Not applicable — navigation is part of the shell and never loads |
| **Empty / Error / Success** | Not applicable |
| **Responsive** | `env(safe-area-inset-bottom)` aware; it hides on scroll-down and reappears on scroll-up so it does not steal reading space, and it remains visible whenever focus is inside it |
| **Accessibility** | A `nav` landmark with an accessible name; `aria-current="page"` on the active item; every item keeps a visible text label so icons are never the only signal; reachable by keyboard in DOM order and never hidden behind an overlay |

---

## 14. Interaction design standards

These are decisions, each with a reason. Where a mainstream convention exists it is
adopted unless a reason to deviate is stated.

### 14.1 Navigation and active states

- The active destination is marked by **weight, colour and an underline** — never colour
  alone.
- Navigation never blocks on data: the shell renders first and content streams in.
- A resource link opens in the same tab. "Open in a new tab" is a deliberate, labelled
  affordance rather than a default, because a new tab is disorienting on a phone.

### 14.2 Search, suggestions and filtering

| Decision | Rule |
| --- | --- |
| When to search | As the user types, debounced at roughly 300 ms — never on every keystroke |
| Suggestions | Matching subjects and institutions appear before free-text results, because the taxonomy is more reliable than a guess at a title |
| Empty query | Browse affordances rather than nothing: search is an accelerator, not the only door |
| Filters | Applied immediately, reflected in the URL, individually removable, and counted visibly |
| Cleared filters | Always reversible in one action, with the query preserved |
| No results | Name the query, name the filters, and offer "clear filters" and "browse instead" |

### 14.3 Upload progress

- Three distinct phases are shown: **transferring** (determinate, with size and an
  estimate), **verifying** (a labelled indeterminate state, because inspection happens
  server-side), and **done**.
- Progress is never faked, and never resets to zero on retry.
- A failed transfer **keeps the chosen file**, so the user retries instead of reselecting.
- Leaving the page mid-upload warns before discarding.

### 14.4 Form validation

| Decision | Rule |
| --- | --- |
| When | On blur for format, and on submit for everything. **Never on every keystroke**, which punishes a user mid-typing |
| Where | Beside the field, in text, with an icon shape as well as colour |
| Announced how | `aria-describedby` plus `aria-invalid`; focus moves to the first invalid field on submit |
| Error wording | States the requirement, not the failure — "Use at least 12 characters" rather than "Invalid password" |
| Preserved input | Input is never cleared by a failed submission |
| Success | Stated per section, naming what changed |

---

### 14.5 Confirmations

- **Reversible actions do not get a dialog.** Use inline confirmation plus undo.
- **Irreversible actions get a dialog** that names the object and the consequence:
  *"Delete 'Operating Systems — Unit 3 notes'? Its 14 saves by other students will be
  removed. This cannot be undone."*
- The destructive control is never the default focus, and the safe option is always the
  visually primary one.
- The browser's native `confirm()` is never used. It cannot name the object, cannot be
  styled, cannot be translated, and blocks the page.

### 14.6 Toasts and notifications

| Decision | Rule |
| --- | --- |
| Use | The outcome of an action just taken, and undo |
| Never | As the only record of a failure that needs attention, or for anything the user must read before continuing |
| Duration | Informational toasts dismiss after about 5 s, pause on hover and on focus, and are dismissible by keyboard |
| Announcement | `role="status"` for information, `role="alert"` for failures |
| Count | At most one visible at a time, queued rather than stacked |

### 14.7 Loading indicators

- Skeletons that **mirror the final layout**, so nothing moves when data arrives.
- A spinner is acceptable only inside a control that has no shape to preview — a button
  mid-submit.
- Full-page loaders are not used. The shell is always present, and each data region
  reports its own state.

### 14.8 Pagination rather than infinite scrolling

**Decision: keyset pagination with an explicit "load more", not infinite scroll.**

| Reason | Detail |
| --- | --- |
| Position is preserved | The back button returns to the same place, which infinite scroll breaks |
| Deep linking works | A page of results is addressable and shareable |
| No hidden failure | If loading fails, the user knows where they were |
| Data cost is bounded | A user on mobile data chooses when to load more |
| Accessibility | Focus and reading position are never lost to injected content |

### 14.9 File previews

| Decision | Rule |
| --- | --- |
| Default | The first page of a PDF where feasible; otherwise a file summary card |
| Cost | Generated lazily and cached; it never blocks the metadata |
| Failure | If preview generation fails, metadata and actions remain fully usable |
| Downloads | Responses set `Content-Disposition: attachment`; nothing that could execute is rendered inline |
| Accessible alternative | The preview always has a text alternative — format, size and document title |

### 14.10 Keyboard interactions

| Key | Behaviour |
| --- | --- |
| `Tab` / `Shift+Tab` | Linear traversal in DOM order, with a visible focus ring on everything |
| `Esc` | Closes the topmost overlay and returns focus to the element that opened it |
| `Enter` / `Space` | Activates the focused control; `Space` does not scroll while a control has focus |
| Arrow keys | Move within a listbox, radio group or tab set |
| `/` | Focuses the search field, except while typing in another field |
| Skip link | The first `Tab` on any page reveals "Skip to content" |

### 14.11 Reduced motion

Honoured at the token level: transforms become opacity-only, skeletons become static,
and non-essential durations collapse to zero. Nothing that conveys state is removed, and
no content becomes reachable only through an animation.

---

## 15. Accessibility standard

### 15.1 The baseline

**Target: WCAG 2.2 level AA**, on every screen, as an implementation standard rather
than a later audit. This includes the criteria added in WCAG 2.2, which are easy to miss:

| WCAG 2.2 addition | Where it applies here | Our rule |
| --- | --- | --- |
| **2.4.11 Focus not obscured (minimum)** | Sticky top bar, bottom tab bar, sticky action bar | A focused element must never be hidden behind fixed chrome. Scroll-into-view accounting for the chrome height is required |
| **2.5.7 Dragging movements** | The upload dropzone | Dragging is an enhancement only; a button-based file picker is always present |
| **2.5.8 Target size (minimum)** | Every control | We target 44 × 44 px, comfortably above the 24 × 24 px minimum |
| **3.3.7 Redundant entry** | Upload form, onboarding | Information already provided (academic context) is prefilled, never asked for twice in one flow |
| **3.3.8 Accessible authentication** | Sign-in | No puzzle solving, no memory test, no blocking of paste or password managers. Email and password only, with autofill supported |

### 15.2 The requirements, for each area

**Semantic structure.** One `<h1>` per page, headings in order, real landmarks
(`banner`, `navigation`, `main`, `contentinfo`), real lists and real tables. Semantics
come from elements, not from `role` attributes bolted onto divs.

**Keyboard navigation.** Every interactive element is reachable and operable by
keyboard. Focus order follows reading order. Focus is visible at all times, with a 2 px
ring at a 2 px offset, on every control including links and custom widgets. Focus is
never trapped except inside a modal, and is always restored to the trigger on close.

**Colour contrast.** Body text ≥ 4.5:1, aiming for 7:1; large text ≥ 3:1; interactive
boundaries and focus indicators ≥ 3:1. Verified in both themes with a tool at `M4`, and
re-verified at `M10`. Until then, compliance is **not claimed**.

**Colour independence.** Category, status, validation state and active navigation all
carry a text label or a distinct icon shape. Nothing is communicated by colour alone.

**Forms.** Every input has a visible, persistent label — never a placeholder standing in
for one. Errors are in text, associated with their field, and announced. Required fields
are indicated in text. Success is confirmed per section.

**Screen readers.** Icon-only controls carry an accessible name. Live regions announce
search result counts, upload progress and asynchronous failures. Decorative elements are
hidden from the accessibility tree. Custom widgets (combobox, dialog, tabs) use the
correct roles and states, or are replaced with simpler native elements.

**Touch and motor accessibility.** Targets are 44 × 44 px minimum; controls are not
placed at the very edge of the viewport; no action depends on a gesture, a hover, or a
precise drag.

**Motion.** `prefers-reduced-motion` is honoured globally, degrading transforms to
opacity and removing non-essential durations, without removing content or state.

**Dialogs and menus.** Correct roles, focus management, `Esc` to close, an accessible
name from the dialog title, and full keyboard operation.

**File upload.** The file input is a real input with a visible label; the dropzone is an
enhancement; limits and accepted formats are stated as text before the upload begins;
progress is a labelled progressbar; errors are announced and named specifically.

### 15.3 Proposed standard versus verified compliance

| State | Meaning |
| --- | --- |
| **Proposed standard** | Everything in §15.1–15.2 is a design and implementation target. It describes how the product will be built |
| **Verified compliance** | **None claimed.** Nothing has been built, so nothing has been tested. Conformance is asserted only after the `M10` audit, and only for the pages, journeys and assistive-technology combinations actually tested, with the tooling and method recorded in that report |

Stating this plainly matters. An accessibility claim made before the code exists is
worthless, and a claim made after testing is worth only as much as the record of what was
tested.

---

## 16. Implementation guidance

> **Nothing here has been installed.** No component library, no styling solution and no
> dependency of any kind has been added to the repository. This section states how the
> design system is to be implemented *after approval*, so that the decision is not
> reopened in `M4`.

### 16.1 Styling approach

| Decision | Choice | Reason |
| --- | --- | --- |
| Utility framework | A utility-first CSS framework configured with **our** tokens rather than its defaults | Fast to build with, and it keeps styling colocated with markup |
| Tokens | Defined once as CSS custom properties on the root element, with a dark-theme selector | Theming becomes a token swap rather than a component fork |
| Component styling | Utilities plus a small number of composition classes | Avoids a second styling paradigm fighting the first |
| Forbidden | Inline styles, runtime CSS injection, and class names derived from data | Each breaks either the tokens-only rule or the caching story |

### 16.2 Component primitives — build versus adopt

The honest split, because a fully bespoke component set is not affordable and a fully
adopted one looks generic:

| Category | Approach | Reasoning |
| --- | --- | --- |
| **Behaviourally complex, visually simple** — dialog, sheet, combobox, menu, tabs, tooltip | **Adopt headless, unstyled primitives** | Focus management, `Esc` handling, scroll locking and ARIA wiring are easy to get subtly wrong. These libraries ship no visual design, so nothing generic leaks into the interface |
| **Visually distinctive, behaviourally simple** — button, input, card, `ResourceRow`, `IndexTabs`, `CategoryMark`, `InstitutionMark`, `EmptyState`, `Skeleton` | **Build from scratch** | These carry the identity. Adopting a themed component here is precisely how a product ends up looking like its library |
| **Domain components** — `TaxonomyPicker`, `UploadDropzone`, `ModerationCard`, `QuotaMeter`, `AuditTrail` | **Build from scratch**, composed from the two layers above | They encode EDU-SHARE's own rules and cannot be sourced |

**If a pre-styled component preset is used at all**, then every token is replaced with
ours, the default theme is removed rather than extended, the spacing scale is replaced
rather than extended, the icon set is replaced, and any component that cannot be made
consistent is rewritten. Half-adopted themes are how generic appearance happens.

### 16.3 Layout primitives

Three layout components cover almost every screen and prevent per-screen layout drift:

| Primitive | Purpose |
| --- | --- |
| `AppShell` | Top bar, primary navigation, mobile tab bar, skip link, footer, and the content container with its width variant |
| `PageHeader` | Title, index tabs, description and the primary-action slot — one per screen, always in the same order |
| `SplitView` | The listing-plus-detail arrangement that collapses to a single column below the medium breakpoint |

### 16.4 Theme management

- The theme is a token swap driven by an attribute on the root element. **No component
  knows which theme is active.**
- The user's choice is persisted and applied **before first paint**, so there is never a
  flash of the wrong theme.
- The default follows the operating system; an explicit choice overrides it.
- Dark mode is designed, not inverted: elevation is expressed with surface lightness and
  borders rather than shadows, and category colours use their dark variants.

### 16.5 Accessibility wiring, by construction

- The form primitive owns label association, error association and announcement. A form
  built without it fails review by construction.
- The headless primitives own focus trapping, focus restoration and `Esc`.
- A lint rule forbids `role` where a semantic element exists, and forbids click handlers
  on non-interactive elements.
- The automated accessibility check runs in CI against the design route, so a newly
  introduced primitive cannot silently regress.

### 16.6 The order of work in `M4` (stated here, executed there)

1. Tokens, in both themes.
2. The three layout primitives, so a screen can be assembled before its components exist.
3. `Button`, `TextInput`, `Field`, `Form` — because every other component sits on them.
4. `ResourceRow` and `IndexTabs`, built **against the seeded taxonomy**, because they
   carry the identity and must be designed with real content rather than imagined content.
5. Everything else, each added when the first screen that needs it is built — never
   speculatively.

> **Rule:** a component is built when a screen needs it. Building the whole library first
> produces components designed for imagined content, which is the documented route to a
> generic interface.

---

## 17. Open items in this design system

Recorded so that they remain decisions rather than becoming omissions.

| # | Open item | Owner | When |
| --- | --- | --- | --- |
| 1 | The display typeface is a **proposal**. Its file size and its rendering at small sizes must be checked before it is committed to | Design system owner | `M4` |
| 2 | Contrast has been **designed for, not verified**. Every text and boundary pairing is checked with a tool, in both themes | Implementation | `M4`, re-checked at `M10` |
| 3 | Category colours must be checked for distinguishability in greyscale **and** under the common colour-vision deficiencies. The text label is the guarantee; the colours are a nicety | Design system owner | `M4` |
| 4 | The exact document preview mechanism depends on the runtime's capabilities and is decided when `SC-08` is built | Implementation | `M7` |
| 5 | The `SC-10` tab pattern is acceptable **only** if it can be implemented correctly; otherwise it becomes a pair of links | Implementation | `M8` |
| 6 | Empty-state and error-state **copy** is written per screen during `M4`–`M9`, not drafted here, because copy written without the screen in front of you is always wrong | Implementation | `M4`–`M9` |
| 7 | Whether the centre item in the mobile tab bar is Upload or Search is a judgement to be made once the primary journey can be measured | Product owner | `M10` |
| 8 | The illustration set is limited to three or four shapes. If it grows, it has stopped being a system | Design system owner | `M4` |
| 9 | The naming convention for tokens (`--surface-canvas` versus `--color-surface-canvas`) is settled when the token file is written, and then never changed again | Implementation | `M4` |

---

## 18. Summary

| Item | State |
| --- | --- |
| Design identity defined | Yes — "margin and index", a warm-paper palette with ink and brass |
| Tokens defined | Yes — colour, type, space, radius, elevation, motion, for light and dark |
| Contrast verified | **No** — designed for, not measured |
| Components specified | Yes — 40 components with states and accessibility notes |
| Components built | **No** — none |
| Screens specified | Yes — 15 screens with goals, states, responsive behaviour and accessibility notes |
| Screens built | **No** — none |
| Component library installed | **No** |
| Accessibility standard stated | Yes — WCAG 2.2 AA as an implementation target |
| Accessibility compliance claimed | **No** — nothing has been tested |
| Libraries or dependencies added to the repository | **None** |

*End of design system. Every token, colour, size and duration in this document is a
proposal. No component exists, no library has been installed, and no page has been
built.*
















---

