# Appearance & Branding

Mitch‑Risk supports full visual customisation to match your organisation's identity. All settings are configured under **Settings → Appearance** and require the **Settings: manage** permission.

Changes take effect immediately — no restart or rebuild required.

---

## Organisation Name & Logo

### Organisation Name

Set under **Settings → General**. The organisation name appears in:

- The **sidebar header** (next to the logo)
- The **login screen**
- **Email signatures** (via the `{{organizationName}}` template token)
- **PDF reports**
- The **browser tab title**

### Logo

Upload under **Settings → Appearance**. Supported formats: **PNG, SVG, JPEG**.

The logo appears in:

- The **sidebar header** — displayed above the organisation name
- The **login screen** — centred above the sign-in form
- Navigate to **Settings → Appearance** and click the logo area to upload or replace. Click **Remove logo** to revert to the text-only organisation name display.

---

## Colour Palette

### Brand Colours

| Setting | Where It Applies |
|---------|-----------------|
| **Primary colour** | Buttons, links, active navigation items, focus rings, toggle switches, and form accents |
| **Secondary colour** | Hover states, selected backgrounds, accent borders, and secondary UI chrome |

Both accept any valid CSS hex colour (e.g. `#2563eb`). Leave a field blank to use the default.

### RAG (Red / Amber / Green) Palette

RAG colours are used exclusively for **compliance and scoring indicators** — vendor risk scores, finding severity badges, compliance heatmaps, and dashboard distribution charts. They are intentionally separate from brand colours to avoid visual confusion.

| Setting | Default | Used For |
|---------|---------|----------|
| **RAG green** | `#22c55e` | Compliant scores, green (low risk) vendors, resolved findings |
| **RAG amber** | `#eab308` | Borderline scores, amber (medium risk) vendors |
| **RAG red** | `#ef4444` | Non-compliant scores, red (high risk) vendors, open findings |
| **RAG unscored** | `#6b7280` | Unscored assessments (not yet submitted or all N/A) |

> RAG colours are **only** for compliance signals — they are not used for UI chrome like buttons, links, or status indicators. Those use the brand primary/secondary colours or semantic tokens (`--success`, `--destructive`).

---

## Layout

### Border Radius

Controls how rounded UI elements appear. Accepts values from **0** (sharp corners) to **16** (fully rounded).

Affects: cards, buttons, inputs, dropdowns, modals, badges, and tabs.

### Page Width

| Option | Behaviour |
|--------|-----------|
| **Constrained** (default) | Content is centred with a maximum width. Provides a focused, readable experience. The sidebar and dashboard are full-width. |
| **Full** | All page content stretches to the full browser width. Useful for wide displays or data-dense screens. |

---

## How It Works

Appearance settings are stored in the database and served via React Server Components. The `ThemeTokens` component reads the configuration at request time and injects CSS custom properties into the document head. No client-side flickering, no build step, no cache invalidation.

When you change a colour, the new value is written to the database. The next page load picks it up and injects it into the CSS. Logo uploads are handled the same way — the file is stored via the configured storage backend and served through an authenticated route.

---

## Resetting to Defaults

To restore the default appearance, clear each colour field and save. The application falls back to its built-in design tokens for any blank field. The logo can be removed by clicking **Remove logo**.
