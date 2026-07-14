# ContaMind AI — Design Principles
**Version:** 2.0 — Updated for 2026 Stack
**Purpose:** Design system reference for product development
**Last Updated:** March 2026

---

## 0. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **CSS Framework** | Tailwind CSS | 4.x | Utility-first styling |
| **Components** | React + TypeScript | 19.2 + 5.7+ | Component library |
| **Icons** | Lucide React | — | Consistent iconography |
| **Responsive** | Mobile-first | — | All components responsive |

---

## Philosophy

ContaMind AI's visual language is built on one idea: **intelligence made simple**. The interface should feel like it was designed by someone who deeply understood the problem — not by someone trying to impress. Every pixel either communicates something or is removed.

The product borrows from Apple's Human Interface Guidelines: generous white space, precise typographic hierarchy, and a color palette that guides attention rather than competes for it. The design's sophistication is expressed through restraint.

---

## Color

### Palette

```css
/* Backgrounds */
--white:        #ffffff;
--off-white:    #f5f5f7;

/* Borders */
--border:       #e0e0e5;
--border-light: #ebebf0;

/* Text */
--text-1: #1d1d1f;   /* headings, primary */
--text-2: #424245;   /* body copy */
--text-3: #6e6e73;   /* secondary, captions */
--text-4: #aeaeb2;   /* muted, metadata */

/* Brand */
--accent:       #0071e3;   /* Apple blue — primary action color */
--accent-hover: #0077ed;
--accent-soft:  #e8f0fc;   /* tint for tags, highlights */

/* Semantic */
--green:        #30d158;   /* success, positive delta */
--green-soft:   #e6f9ed;
--red:          #ff3b30;   /* negative delta only */
--amber:        #ff9f0a;   /* warning states */
```

### Rules

- **White and off-white are the only backgrounds.** Surfaces alternate between the two to create rhythm without relying on dividers. The single exception is dark (`--text-1`) surfaces used for high-emphasis moments like featured cards or final CTAs.
- **Accent blue is used sparingly.** It appears on interactive elements (buttons, links, active states), section labels, and one-per-section emphasis moments. Never as a decorative fill.
- **Color never carries meaning alone.** Every color-coded state — positive, negative, warning — is always accompanied by an icon, label, or textual context. The UI is fully understandable in grayscale.
- **Avoid gradients.** The palette is flat. Depth is created through shadow and layering, not color blending.

### Semantic Color in Data Contexts

When displaying financial data or status indicators:

| Signal | Color | Soft background |
|---|---|---|
| Positive / growth | `#30d158` | `#e6f9ed` |
| Negative / decrease | `#ff3b30` | `#fff0f0` |
| Warning / attention | `#ff9f0a` | `#fff8ec` |
| Informational | `#0071e3` | `#e8f0fc` |

---

## Typography

### Typefaces

**Instrument Serif** — display and headline use only. A contemporary editorial serif with humanist proportions. It communicates intelligence and credibility. The italic variant is used selectively to add warmth to key phrases. Never use for UI labels, data, or interactive elements.

**Geist Sans** — all UI text. Geometric, neutral, highly legible at small sizes. Used for navigation, body copy, labels, data values, tags, and buttons. Its technical precision complements the serif without competing.

```css
--serif: 'Instrument Serif', Georgia, serif;
--sans:  'Geist', -apple-system, sans-serif;
```

### Type Scale

| Role | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Display / H1 | Serif | `clamp(3rem, 6vw, 5rem)` | 400 | `−0.02em` |
| Section H2 | Serif | `clamp(1.9rem, 3.5vw, 2.9rem)` | 400 | `−0.02em` |
| Card heading H3 | Sans | `0.93–1.05rem` | 600 | — |
| Body | Sans | `0.97rem` | 400 | — |
| Small body | Sans | `0.79–0.86rem` | 400 | — |
| Section label | Sans | `0.72rem` | 600 | `0.10em` |
| Tag / badge | Sans | `0.72rem` | 500–600 | `0.03–0.06em` |
| Metadata | Sans | `0.65–0.70rem` | 400–500 | `0.06–0.10em` |

### Rules

- **Serif for meaning, sans for function.** Headlines and feature quotes use Instrument Serif. Everything the user interacts with — buttons, labels, inputs, data — uses Geist Sans.
- **Italic emphasis is a tool, not decoration.** Within serif headlines, a key phrase is italicized to create rhythm and draw focus. Use once per heading, never more.
- **Line heights are generous.** Body text: `1.65`. Small text: `1.58`. Display text: `1.08–1.15`. Never compress line height for density.
- **Use `clamp()` for all display sizes.** No display or heading font size is fixed — it scales fluidly with the viewport.
- **No bold body text.** Weight contrast in body copy is achieved through color (`--text-2` vs. `--text-3`), not by bolding.

---

## Spacing & Shape

### Border Radius

```css
--radius:    18px;  /* cards, panels */
--radius-sm: 10px;  /* inputs, small chips, inner elements */
```

Buttons use `24px` radius (pill-shaped). Tags and badges use `20px`. Do not mix radius values arbitrarily — every shape belongs to one of these three tiers.

### Spacing Scale

Base-8 scale. Common values:

| Value | Use |
|---|---|
| `4px` | Icon gaps, tight internal spacing |
| `8px` | Between list items, inline gaps |
| `12px` | Card internal gaps |
| `16px` | Component padding, grid gaps |
| `24px` | Section subdivisions |
| `32px` | Between major components |
| `48px` | Section padding horizontal |
| `80px` | Section padding vertical |

### White Space

White space is not empty space — it is a design element. Sections should feel open and breathable. When in doubt, add more space. Density should only appear in data-heavy contexts (tables, cost breakdowns) and must be deliberate.

---

## Elevation & Shadow

Depth is communicated through shadow, not color. Three shadow levels:

| Level | Value | Use |
|---|---|---|
| Subtle | `0 1px 4px rgba(0,0,0,0.05)` | White cards on off-white backgrounds |
| Default | `0 4px 20px rgba(0,0,0,0.07)` | Hovered cards, dropdowns |
| Prominent | `0 8px 40px rgba(0,0,0,0.10)` | Modals, windows, popovers |

The navigation bar uses `backdrop-filter: blur(20px) saturate(180%)` with a bottom border — not a shadow — to achieve its frosted-glass effect.

---

## Components

### Cards

Two variants, chosen based on the background they sit on:

**Filled card** — used on white backgrounds. Background: `--off-white`. Border: `1px solid --border-light`. Radius: `--radius`.

**White card** — used on off-white backgrounds. Background: `--white`. Border: `1px solid --border-light`. Radius: `--radius`. Box shadow: subtle level.

Card padding is `26–28px`. Cards are never borderless — the `1px` border is always present.

### Buttons

| Variant | Use case | Background | Text |
|---|---|---|---|
| Primary | Main CTA, one per view | `--accent` | White |
| Ghost | Secondary actions | Transparent | `--text-2` |
| White | CTAs on dark surfaces | `#ffffff` | `--text-1` |
| Ghost white | Secondary on dark surfaces | Transparent | `rgba(255,255,255,0.7)` |

All buttons: `border-radius: 24px`, padding `12px 28px`, font-size `0.9rem`, weight `500`. Primary button includes a blue box-shadow. Never use more than one primary button in the same view.

### Tags & Badges

Small inline labels. Padding `4px 12px`, radius `20px`, size `0.72rem`, weight `500–600`. Default variant: `--accent-soft` background with `--accent` text. Success variant: `--green-soft` with `#1a7a3a` text. Use tags to categorize, not to decorate.

### Interactive States

| State | Treatment |
|---|---|
| Hover (card) | `translateY(−2px)` + shadow upgrade |
| Hover (button primary) | `translateY(−1px)` + shadow intensifies, `--accent-hover` |
| Hover (button ghost) | Background fills to `--off-white` |
| Hover (list item) | Background transitions to `--accent-soft` |
| Active (toggle, tab) | Background `--text-1`, text white |
| Disabled | `opacity: 0.4`, no pointer events |

All transitions: `0.15s–0.20s ease`. No bounce, spring, or elastic easing in UI interactions.

---

## Iconography

In the shipping product, use a consistent icon library — **Lucide** is preferred. Icons should be `16–20px` in interactive contexts and `20–24px` in card headers. Always pair icons with text labels. Never use icon-only controls without a tooltip.

---

## Motion

### Principles

- Motion should feel **natural**, not performed. Animations communicate state changes, guide attention, or provide feedback — never purely decorative.
- **No looping animations** in the primary interface.
- **Duration is short.** UI transitions: `150–200ms`. Scroll reveals: `550ms`. Data animations: `500ms` with stagger.

### Scroll Reveal

Content enters from below on scroll. Starting state: `opacity: 0; transform: translateY(18px)`. End state: `opacity: 1; transform: translateY(0)`. Transition: `0.55s ease`. Use `100ms` stagger delays between sequential elements in the same group.

### Hover Transitions

All hover effects use `0.15s–0.20s ease`. No `transform` value in hover should exceed `translateY(−2px)`. Shadow transitions can be slightly slower (`0.20s`) than position transitions for a layered feel.

### Data Visualization

Chart bars and progress indicators animate on first view using sequential stagger (`55ms` between elements), triggered once by scroll.

---

## Voice in UI

Text is direct, confident, and warm. It never apologizes or hedges.

| ✓ Do | ✗ Don't |
|---|---|
| "Empieza gratis" | "Haz clic aquí para comenzar tu prueba gratuita" |
| "Contabilidad que piensa contigo." | "Una solución integral de gestión empresarial" |
| "14 días gratis, sin tarjeta." | "Ofrecemos un período de prueba sin compromiso" |
| "El cliente no quiere software." | "Nuestro software está diseñado para satisfacer..." |

Labels are noun-based and scannable. Descriptions are one or two sentences maximum. Calls to action use active verbs.

---

## Design Tokens

```css
:root {
  --white:        #ffffff;
  --off-white:    #f5f5f7;
  --border:       #e0e0e5;
  --border-light: #ebebf0;

  --text-1: #1d1d1f;
  --text-2: #424245;
  --text-3: #6e6e73;
  --text-4: #aeaeb2;

  --accent:       #0071e3;
  --accent-hover: #0077ed;
  --accent-soft:  #e8f0fc;

  --green:      #30d158;
  --green-soft: #e6f9ed;
  --red:        #ff3b30;
  --amber:      #ff9f0a;

  --serif: 'Instrument Serif', Georgia, serif;
  --sans:  'Geist', -apple-system, sans-serif;

  --radius:    18px;
  --radius-sm: 10px;
}
```