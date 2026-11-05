# Internationalization

Mitch‑Risk ships with twelve languages:

| Code | Language |
|---|---|
| `en` | English |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese (Brazil) |
| `it` | Italian |
| `nl` | Dutch |
| `ja` | Japanese |
| `ko` | Korean |
| `zh` | Simplified Chinese |
| `ar` | Arabic |
| `hi` | Hindi |

The language is chosen per browser through a cookie — there are no `/[locale]/` URL segments. The non-English/Spanish catalogs are **machine-assisted first-pass translations**; native review is recommended before treating them as final copy.

## For users

The initial language for a new visitor is the **organisation default** configured in **Admin → General → Default language**. English is the built-in default.

A user can override that choice at any time:

- **Logged in** — user menu (top-right) → **Language**
- **Logged out / auth screens** — language selector in the top-right
- **Public trust center** — language selector in the header
- **Vendor portal** — language selector in the portal header

The choice is stored in the `NEXT_LOCALE` cookie for one year and applies to all pages in that browser. Clearing cookies resets it to the organisation default.

### Resolution order

1. `NEXT_LOCALE` cookie (explicit user choice)
2. Organisation default language (**Admin → General**)
3. Browser `Accept-Language` header, including regional variants (`es-MX` → `es`)
4. English

### What is translated

- All internal app screens, admin sections, empty states, validation messages, and dialogs
- Public trust center and vendor questionnaire portal
- Built-in email defaults
- Assessment, framework, and portfolio PDFs

The REST API, OpenAPI/Swagger documentation, and audit CSV exports remain in English because they are consumed by machines and external integrations. Custom email templates are sent exactly as written; only the built-in defaults are localized.

## For developers

Message catalogs live in:

```
messages/en.json        ← source of truth for keys
messages/<locale>.json  ← one catalog per shipped locale
```

Locale plumbing lives in:

```
lib/i18n/config.ts              supported locales, cookie name, display labels, RTL
lib/i18n/locale.ts              cookie → org default → Accept-Language resolution
lib/i18n/request.ts             next-intl request configuration
lib/i18n/messages.ts            catalog loaders
lib/actions/locale.ts           server action that writes the cookie
hooks/use-locale-switch.ts      client-side switch + router.refresh()
lib/pdf/fonts.ts                PDF font families per locale
lib/pdf/fonts/                  bundled Noto font files + OFL license
app/layout.tsx                  sets <html lang> and dir
```

The default language is stored in the `organization.defaultLocale` app setting and edited in **Admin → General**.

### Adding a new language

The example below adds Swedish (`sv`).

#### 1. Register the locale

In `lib/i18n/config.ts`:

```ts
export const LOCALES = [
  // …existing locale codes…
  "sv",
] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  // …existing labels…
  sv: "Svenska",
};

const RTL_LOCALES: readonly Locale[] = ["ar"];
```

`LOCALE_LABELS` is the name shown in every language selector. Use the language's own name. Add the locale to `RTL_LOCALES` only if it is right-to-left (Arabic is already there).

This automatically updates:

- the login/setup language selector
- the user-menu language menu
- the trust center and portal selectors
- the **Default language** field in **Admin → General**
- the `organization.defaultLocale` validation schema
- `Accept-Language` matching for regional variants (`sv-FI` → `sv`)

#### 2. Add the catalog

Copy `messages/en.json` to `messages/sv.json` and translate the **values**. Do not translate or rename keys.

If the sibling translation toolkit is available, it can produce a first pass:

```bash
node ../translation/bin/translate-messages.mjs --project . --targets sv=sv
node ../translation/bin/validate-catalogs.mjs --project . --targets sv
```

Treat that output as machine-assisted draft copy; review UI labels, legal text, and error messages with a native speaker.

Preserve every ICU construct exactly:

```json
"tracked": "{count, plural, one {# vendor tracked} other {# vendors tracked}}",
"pageSummary": "Page {page} of {totalPages}"
```

The English catalog is the source of truth. `lib/i18n/messages.test.ts` fails if any locale is missing a key, has an extra key, drops a placeholder, or changes a literal import field name.

#### 3. Register the catalog loader

In `lib/i18n/messages.ts`:

```ts
const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: AbstractIntlMessages }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  sv: () => import("../../messages/sv.json"),
};
```

#### 4. Add translated built-in email defaults

Built-in email templates are stored as defaults in `lib/settings/email-template-defaults.ts`. TypeScript requires one entry per locale:

```ts
const swedishDefaults: EmailTemplateSettings = {
  inviteSubject: "Säkerhetsformulär: {{assessmentTitle}}",
  inviteBody: "...",
  // ...one key for every subject/body field
};

const LOCALIZED_DEFAULTS: Record<Locale, EmailTemplateSettings> = {
  en: englishDefaults,
  es: spanishDefaults,
  sv: swedishDefaults,
};
```

Keep the `{{token}}` placeholders unchanged. Admin-authored email templates are not affected.

Emails are rendered in the **organisation default language**, because scheduled emails have no request locale. PDFs follow the request locale.

#### 5. Check PDF fonts and text direction

PDFs do not use browser fonts. `lib/pdf/fonts.ts` registers the bundled Noto families and maps each locale to one family:

- Latin/Cyrillic — `NotoSans`
- Arabic — `NotoSansArabic`
- Devanagari — `NotoSansDevanagari`
- Japanese — `NotoSansJP`
- Korean — `NotoSansKR`
- Simplified Chinese — `NotoSansSC`

If the new language uses a script that is not covered:

1. Add the OFL-licensed font files under `lib/pdf/fonts/` and update its README/OFL notice.
2. Extend `PdfFontFamily`, `registerPdfFonts()`, and `pdfFontFamily()` in `lib/pdf/fonts.ts`.
3. Keep the `outputFileTracingIncludes` entry in `next.config.ts` so standalone builds include the font files.
4. Generate a PDF in the new locale and check that all glyphs render.

Arabic sets `dir="rtl"` at the root, in PDF pages, and in outbound HTML email. The layout has not had a full RTL audit, so treat Arabic as best-effort and check navigation, tables, icons, and PDF pagination.

#### 6. Add locale tests and run the quality gate

Add at least one end-to-end assertion in `e2e/i18n.spec.ts` that switches to the new language and checks a visible heading. The existing test is a good template.

Locale resolution itself is covered by `lib/i18n/locale.test.ts`; regional tags such as `sv-FI` are handled automatically.

```bash
npm run precheck        # typecheck + lint + format:check
npm test                # catalog parity + unit/integration tests
npm run build
npm run test:e2e        # requires the test database; see README
```

Also check any screen that uses a changed plural/select message in the new language. Invalid ICU
syntax (for example literal `<...>` tags) raises a next-intl runtime error when the message is
rendered. Avoid `<`/`>` in message text; use `[id]` or the rich-text API instead.

### Translation rules

- Use full descriptive names; the translator variable must be named `translations` (or a descriptive qualified name such as `commonTranslations`), never `t`.
- Never hardcode user-facing text. Add a key to every catalog in the same change.
- Keep `{placeholders}` and ICU plural forms identical in name and nesting across languages. Plural categories can differ by language (`one`/`other`, `few`, `many`, etc.).
- Do not use `<...>` literally inside a message — ICU treats it as a tag. Use `[id]` or next-intl's rich-text/`t.rich` API instead.
- Use `useFormatter()` in client components and `getFormatter()` in server components/PDFs for dates and numbers. Do not use `formatDate()` on translated surfaces — it is fixed to `en-GB`.
- Keep JSON files UTF-8. The repo's mojibake test scans source and markdown and fails on Windows-1252 corruption.
- For dynamic labels (statuses, tiers, question types), make sure every enum value has a catalog entry, or use `translations.has(...)` with a fallback.

### Right-to-left languages

`app/layout.tsx` sets both `lang` and `dir` from the resolved locale. Arabic is marked RTL via `RTL_LOCALES` in `lib/i18n/config.ts`; PDF pages and outbound HTML email receive the same direction. The layout has not had a full RTL audit, so Arabic should be treated as best-effort until navigation, tables, icons, and PDF pagination are visually verified.

### Current limitations

- The non-English/Spanish catalogs are machine-assisted first-pass translations; native review is recommended before treating them as final copy.
- `app/global-error.tsx` stays English because it renders outside the locale provider.
- Swagger UI is a third-party English bundle; the surrounding `/docs` page chrome is translated.
- The developer-only `/style-guide` page is not translated.
- The REST API, OpenAPI spec, and audit CSV exports remain English.
- Emails use the organisation default rather than the recipient's browser preference.
- The bundled PDF fonts add roughly 38 MB to the repository and container image. Arabic/Hindi complex-script shaping is best-effort.
- The UI font (Geist) is Latin-subset; CJK, Arabic, and Devanagari glyphs rely on operating-system fallback fonts.
