# Trust Center

The Trust Center is a public page at `/trust` where your organisation publishes its security posture: compliance badges, security documents, subprocessors and narrative sections. Vendors and partners can view it without a login — send them the link, or let invite emails point at it.

## Enabling the Trust Center

1. Go to **Settings → Trust Center**
2. Tick **Enable the trust center** and save

While disabled, `/trust` returns a not-found message and nothing is served publicly.

## Curating content

Open **Manage → Trust center** in the sidebar. Four blocks are available; each item has a publish toggle, so you can prepare drafts and publish when ready. Unpublished items never appear on the public page.

### Compliance badges

Certification tiles such as SOC 2, ISO 27001 or GDPR. Each badge has:

- **Title and issuer** — shown on the tile
- **Description** — optional supporting text
- **Badge image** — PNG, JPG, GIF or WebP (max 2 MB, SVG not allowed)
- **Verification URL** — optional link to an auditor listing or certificate
- **Expiry awareness** — expired or soon-to-expire badges are labelled on the public page

### Security documents

Upload PDFs, images or Office documents (max 20 MB) for public download — policies, security reports, DPAs, penetration test summaries. Re-uploading replaces the file; deleting a document removes the file from storage.

### Subprocessors

The standard name / purpose / data-location table. Optionally link each subprocessor's website.

### Custom sections

Free markdown blocks for anything the structured types don't cover — an overview, an FAQ, disclosure commitments.

## Public page

Visit `/trust` (or click **View public page** in the manager). The page is branded with your logo and theme colours, rate-limited against abuse, and shows **only published** content. Use the "View public page" button to check your work as you edit.

## Invite emails

Tick **Link to the trust center in vendor invite emails** and every assessment invite gains a footer line pointing at the page. The link is added when the email is sent — your stored templates are not modified.

## Multi-instance note

The enable/disable and rate-limit settings are per deployment. If you scale horizontally, content and settings are shared through the database, and public-page rate limits apply per instance.
