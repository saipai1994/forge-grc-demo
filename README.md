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

To add an industry, add a spec in `profiles-a.js` or `profiles-b.js` (see `profile-kit.js` for the format) and, if needed, new frameworks and a pack in `regulatory-library-sectors.js`.

## What is in the app

- Standards & data: built-in library of frameworks, laws and directions with industry packs, clause-level detail for the major standards, and search.
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
| `profile-kit.js`, `profiles-a.js`, `profiles-b.js`, `industry-profiles.js` | Industry profiles and the profile switcher |
| `openpages-modules.js` | Core engine: issues, controls, KRIs, policies, vendors, executive view |
| `compliance-modules.js`, `privacy-resilience.js`, `risk-ops.js`, `rcsa.js`, `sector.js`, `standards-hub.js` | Feature modules |

## Notes

Library entries are plain-language summaries for planning and mapping, not legal text. Verify applicability, dates and wording against the official source with your legal and compliance team. Data is stored in the browser (localStorage) per profile.
