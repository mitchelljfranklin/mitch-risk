# Internationalization

Mitch‑Risk ships with English (`en`) and Spanish (`es`). The language is chosen per browser through a cookie — there are no `/[locale]/` URL segments.

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
messages/en.json   ← source of truth for keys
messages/es.json
```

Locale plumbing lives in:

```
lib/i18n/config.ts              supported locales, cookie name, display labels
lib/i18n/locale.ts              cookie → org default → Accept-Language resolution
lib/i18n/request.ts             next-intl request configuration
lib/i18n/messages.ts            catalog loaders
lib/actions/locale.ts           server action that writes the cookie
hooks/use-locale-switch.ts      client-side switch + router.refresh()
```

The default language is stored in the `organization.defaultLocale` app setting and edited in **Admin → General**.

### Adding a new language

The example below adds French (`fr`).

#### 1. Register the locale

In `lib/i18n/config.ts`:

```ts
export const LOCALES = ["en", "es", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
};
```

`LOCALE_LABELS` is the name shown in every language selector. Use the language's own name.

This automatically updates:

- the login/setup language selector
- the user-menu language menu
- the trust center and portal selectors
- the **Default language** field in **Admin → General**
- the `organization.defaultLocale` validation schema

#### 2. Add the catalog

Copy `messages/en.json` to `messages/fr.json` and translate the **values**. Do not translate or rename keys.

Preserve every ICU construct exactly:

```json
"tracked": "{count, plural, one {# vendor tracked} other {# vendors tracked}}",
"pageSummary": "Page {page} of {totalPages}"
```

The English catalog is the source of truth. `lib/i18n/messages.test.ts` fails if any locale is missing a key or has an extra key.

#### 3. Register the catalog loader

In `lib/i18n/messages.ts`:

```ts
const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: AbstractIntlMessages }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  fr: () => import("../../messages/fr.json"),
};
```

#### 4. Add translated built-in email defaults

Built-in email templates are stored as defaults in `lib/settings/email-template-defaults.ts`. TypeScript requires one entry per locale:

```ts
const frenchDefaults: EmailTemplateSettings = {
  inviteSubject: "Questionnaire de sécurité : {{assessmentTitle}}",
  inviteBody: "...",
  // ...one key for every subject/body field
};

const LOCALIZED_DEFAULTS: Record<Locale, EmailTemplateSettings> = {
  en: englishDefaults,
  es: spanishDefaults,
  fr: frenchDefaults,
};
```

Keep the `{{token}}` placeholders unchanged. Admin-authored email templates are not affected.

Emails are rendered in the **organisation default language**, because scheduled emails have no request locale. PDFs follow the request locale.

#### 5. Add locale tests (recommended)

Add at least one end-to-end assertion in `e2e/i18n.spec.ts` that switches to the new language and checks a visible heading. The existing test is a good template.

Locale resolution itself is covered by `lib/i18n/locale.test.ts`; regional tags such as `fr-CA` are handled automatically.

#### 6. Run the quality gate

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

`app/layout.tsx` sets `lang` from the resolved locale but does not set `dir`. Arabic, Hebrew, and other RTL languages need an additional `dir` attribute and an audit of directional layout/classes before they can be added.

### Current limitations

- `app/global-error.tsx` stays English because it renders outside the locale provider.
- Swagger UI is a third-party English bundle; the surrounding `/docs` page chrome is translated.
- The developer-only `/style-guide` page is not translated.
- The REST API, OpenAPI spec, and audit CSV exports remain English.
- Emails use the organisation default rather than the recipient's browser preference.
