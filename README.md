# Blackstone UK Property Ltd — website and team workspace

Next.js 16 (App Router) on Node, PostgreSQL, Tailwind 4. Deployed on Render.

## What is included

- Public site: home, property search (server-rendered), property detail pages with EPC / tenure /
  rental facts and status badges, selling, landlords, Halal mortgage enquiries, valuation, contact,
  stamp duty calculator, privacy / cookies / terms.
- Enquiry pipeline: validated form, honeypot, rate limiting, idempotent saves, **Brevo emails** to the
  team and a confirmation to the customer.
- Team workspace at `/manage`: individual logins (owner / staff), enquiry status and notes, search,
  pagination, CSV export, property add / edit / delete, photo upload, audit log.
- SEO: metadata, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`. Security headers and CSP.

## Local development

```bash
npm install
cp .env.example .env.local   # then set ADMIN_EMAIL and ADMIN_PASSWORD
npm run dev
```

Without `DATABASE_URL` the app uses an embedded PostgreSQL (PGlite) stored in `.pglite/`, so no
database setup is needed locally. The schema is created automatically on first request.

```bash
npm test          # unit + API integration tests (in-memory database)
npm run lint
npm run typecheck
npm run build
```

## Deploying to Render

`render.yaml` defines the web service; the PostgreSQL database is a separate Neon project whose
connection string goes into `DATABASE_URL`. In Render choose
**New → Blueprint**, select this repository, and fill the prompted secrets
(`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, later `BREVO_API_KEY`). The first owner account is
created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start; change the password from the workspace.

## Going live checklist

1. Brevo: add and verify the sending domain (SPF, DKIM, DMARC) and sender address, set `BREVO_API_KEY`.
2. Set `SITE_URL` to the final domain and attach the custom domain in Render.
3. Fill the business details shown on the site (`CONTACT_*`, `COMPANY_NUMBER`, `REGISTERED_OFFICE`,
   `ICO_NUMBER`, `REDRESS_SCHEME`, `CMP_SCHEME`, `FINANCE_STATEMENT`). Anything left empty is hidden.
4. Replace the illustrative sample properties and stock photography with real listings and
   photography you have the rights to use (delete or edit them in `/manage`).
5. Have the privacy notice, terms and Halal-finance wording reviewed by a solicitor and confirm the
   FCA position before promoting mortgage services.
