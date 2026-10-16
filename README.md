# Forge GRC demo

A browser-only governance, risk and compliance (GRC) demo. It is industry-agnostic, with a strong BFSI profile, and holds demo data only (do not enter real data).

## Run it

Serve the folder with any static server and open `index.html`:

```
python3 -m http.server 8000
```

`python3 build-standalone.py out.html` builds a single self-contained file for hosting where relative fetches are not possible.

## Industry profiles

Pick a profile in the top bar. Each profile has its own risk register, seeded records, sector registers, framework pack and saved state.

Core: BFSI, Cross-industry, Manufacturing. More: Healthcare, Pharma & life sciences, Insurance, Telecommunications, Energy & utilities, Aviation & aerospace, Government, Retail & e-commerce, IT services & SaaS, Education, Mining & metals, Transport & logistics, Real estate & construction, Fintech & crypto.

To add an industry, add a spec in a file in `sectors/` (see `profile-kit.js` for the format) and, if needed, new frameworks and a pack in `regulatory-library-sectors.js`.

## What is in the app

- Standards & data: built-in library of 278 frameworks and about 2,000 requirements (laws, regulator directions, frameworks and standards) with industry and country packs, clause-level detail for the major standards, and search.
- Jurisdiction selector: India, Australia and New Zealand, Middle East (UAE, Saudi Arabia, Qatar, Bahrain, Oman, Kuwait), Europe (EU, UK, Switzerland), Philippines, United States, Canada, or all. It filters the library (global standards always show) and sets the reporting currency.
- Content review: each framework shows a review panel (status, flagged details, possibly missing items). Library text is plain-language and was written from secondary sources; confirm every item against the official text. `node tools/validate-library.js` and `node tools/validate-profile.js` check structure and depth; `node tools/build-review.js` rebuilds the review data.
- Compliance: obligations register and crosswalk, regulatory change, privacy operations.
- Risk: risk register, RCSA, issues and actions, controls and testing, KRIs and loss events, policies, third parties, executive view.
- Resilience and technology: operational resilience (DORA / RBI style), cyber and technology risk, business continuity.
- Operations: financial crime and conduct (BFSI, fintech), sector registers, internal audit.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell, base views and the loader |
| `library-enhancements.js` | Original manufacturing library and workflow demo |
| `regulatory-library*.js`, `regulatory-clauses.js` | Built-in frameworks, sector frameworks, clause-level detail |
| `profile-kit.js`, `sectors/*.js`, `industry-profiles.js` | Industry profiles and the profile switcher |
| `openpages-modules.js` | Core engine: issues, controls, KRIs, policies, vendors, executive view |
| `compliance-modules.js`, `privacy-resilience.js`, `risk-ops.js`, `rcsa.js`, `sector.js`, `standards-hub.js`, `jurisdiction.js`, `library-review.js` | Feature modules |
| `regulatory-library*.js`, `regulatory-review.js` | Built-in regulatory library by region and the content-review data |

## Notes

Library entries are plain-language summaries for planning and mapping, not legal text. Verify applicability, dates and wording against the official source with your legal and compliance team. Data is stored in the browser (localStorage) per profile.


## Drill-down and drill-up

Every list row, KPI card and table opens a record in the shared drawer (`openpages-modules.js`). The drawer keeps a trail: **‹ Back**, clickable breadcrumbs and **↑ Up** to the parent record (`GRC.parents[type](id)`). `drilldown.js` adds the risk, evidence, finding, framework, area, owner and KPI-list views and wires the original pages.


## Connected mode (shared data, sign-in, audit trail, live updates)

Requires Node 22.13 or later. No packages to install.

```
npm run demo          # app + API at http://localhost:8080 (demo date matches the sample data)
npm run feed          # in a second terminal: a pretend monitoring system sends indicator readings
npm test              # checks for the sync, permissions, ingest and audit trail
```

Open http://localhost:8080 and sign in (demo accounts are shown on the sign-in panel: morgan, jordan, priya, evan, sam and audrey @forge.demo, password `forge-demo`). Open it in two browsers as different people to see changes appear live. Without the server (GitHub Pages, a shared file) the app runs as the browser-only demo.

- `server/server.js`: static files, sign-in (scrypt, signed tokens), per-role permissions enforced on the server, record-level sync with conflict handling, audit trail (SQLite), server-sent events for live updates, and `POST /api/ingest/kri` (header `x-api-key`) for source systems.
- `sync-core.js`: shared by browser and server; turns state changes into record-level operations.
- `connect.js`: sign-in screen, live status, sync and the Audit trail module.
- Environment: `PORT`, `FORGE_DATA` (database folder), `FORGE_SECRET`, `FORGE_INGEST_KEY`, `FORGE_DEMO_PASSWORD`, `FORGE_SHOW_DEMO_LOGINS=0` (hide the demo hint), `FORGE_TODAY`.
- `Dockerfile` runs it in a container; mount a volume at `/data`.

Not yet covered: single sign-on, organisation and entity setup, risks created in the legacy form (they stay in the browser), file uploads for evidence, email alerts, per-field merge of two people editing the same record at once (last write wins), and database backups. See the readiness review.

## Running it for real

Start with `docs/OPERATIONS.md` (deploy, settings, backups), `docs/SECURITY.md` and `docs/READINESS.md` (what is built and what still needs you). Drafts of the privacy policy, terms and data processing agreement are in `docs/legal/` and need a lawyer.

What a new customer gets: an Organisation module (company profile, legal entities, business units, sites) with a setup wizard and a clean-start option, user management with roles and forced password change, notifications (in-app, chat webhook, email relay hook), file attachments on records, CSV import for six record types, and a printable board pack.

## Fiori-style dashboards

`fiori.js` adds a Horizon-like theme (switch to Classic in the top bar), a **Home** launchpad of live KPI tiles with search across apps and records, and an **Overview** page of analytical, list and table cards with a filter bar (area, owner, rating). Tiles and cards use status colours with icons and labels, open the records behind them, and can be hidden and re-ordered per person (saved in the browser).


## Scope, treatment, reports, assurance and the assistant

- **Scope** (`scope.js`): tag records to an entity, unit and site and view the whole app for one of them. Untagged records are group-wide.
- **Settings and trends** (`trends.js`): appetite, targets, currency, real-date mode, daily snapshots and real trend arrows.
- **Risk treatment** (`treatment.js`): risk acceptances with approval and expiry, treatment plans, one approvals queue. Decisions are enforced on the server.
- **Reports and declarations** (`intake.js`, `report.html`): events, policy exceptions, conflicts and gifts, and a confidential speak-up inbox with an anonymous public form.
- **Assurance** (`assurance.js`, `vendor.html`): vendor questionnaires through private links, audit workpapers with sampling and sign-off, and a library review workflow.
- **Assistant** (`assistant.js`): side panel that answers questions about the records you can see; uses Claude when `ANTHROPIC_API_KEY` is set, otherwise a computed briefing.
- **Sign-in options** (`server/`): password, authenticator-app two-step, and OpenID Connect single sign-on. See `docs/OPERATIONS.md` for settings.

Run the checks with `npm test` (server), `npm run test:browser` (needs `npx playwright install chromium`) and `node tests/a11y.js`.

## Documents, e-signature, policies and regulatory compliance

- **Documents** (`dms-core.js`, `dms.js`): folders, versions with SHA-256 checks, retention and legal hold, activity log, links to any record, global search. In connected mode files are stored on the server (virus scan optional, 10 MB limit, extension allow-list).
- **E-signature** (`esign-core.js`, `esign.js`, `sign.html`, `server/esign.js`): signature requests with ordered or parallel signers, typed or drawn signatures, decline and expiry, reminders, a tamper-evident seal and certificate, and one-time links for outside signers. This is a simple electronic signature with an audit trail. It is not Aadhaar eSign, a digital signature certificate or a qualified signature; confirm it is legally sufficient for each use.
- **Policy management** (`policy-plus.js`, `policy-templates.js`): lifecycle, hierarchy, review cycle, attestation campaigns, coverage gaps, 40 starter templates, approval and publishing through e-signature and documents.
- **Regulatory compliance** (`regcomp-plus.js`, `regfeed.js`, `server/regfeed.js`): regulatory feed inbox (RSS/Atom, server-side fetch with address checks, relevance scoring), impact assessments, calendar, filings and returns, inspections, certifications. Suggested feed sources in `server/regfeed-sources.json` are unverified; confirm each before relying on it.
