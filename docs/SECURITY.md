# Security overview

What the product does today, and what it does not. Use this as the starting point for buyer security reviews. It describes the software in this repository; the hosting you choose adds its own controls.

## In place

| Area | What exists |
|---|---|
| Sign-in | Email and password (scrypt, per-user salt), signed tokens that expire after 12 hours, or single sign-on through any OpenID Connect provider (authorization code flow with PKCE, signed ID tokens checked for issuer, audience, expiry and nonce). Password sign-in can be switched off. |
| Two-step sign-in | Authenticator-app codes (RFC 6238) with recovery codes, replay protection, lockout after repeated wrong codes, and an option to require it for everyone. Administrators can reset it for someone who loses their phone. |
| Password rules | At least 10 characters, letters plus numbers or symbols, common passwords refused, no name or email in the password. Administrator-set passwords are temporary and must be changed at first sign-in. |
| Lockout | 5 failed sign-ins lock an account for 15 minutes; per-address rate limit as well. Failed sign-ins and wrong codes are written to the audit trail. |
| Access control | Four roles. Permissions are checked on the server for every change; the browser cannot grant itself access. Approval decisions (risk acceptances, treatment plans, policy exceptions, declarations, workpaper sign-off) can only be made by the named approver or an administrator, never by the requester, and the server refuses records created already approved. |
| Audit trail | Server-side: who changed which record, when, and which fields (old and new value). Sign-ins, user changes, file access, assistant use and speak-up access are included. |
| Tenant separation | Every record and file is scoped to an organisation on the server. |
| Files | Type allow-list, 10 MB limit, stored outside the web root, downloaded only with a valid token, served as attachments with `nosniff`. SHA-256 recorded. Optional virus scanning through ClamAV: infected files are blocked and uploads are refused if the scanner is unavailable. |
| Anonymous speak-up | Reports are stored outside the shared workspace, readable only by administrators and auditors (contact details only by administrators). No name, device or network address is recorded; reporters follow up with two codes. Opening a report is logged. |
| Vendor portal | Private, expiring links (hashed in the database), answers validated and scored on the server, one submission per link. |
| Assistant | Off unless an API key is set. Read-only (no tools), sends a summary the user could already see (never files or speak-up reports), treats record text as data, limited to 40 questions per user per hour, and logs use without storing the question. |
| Transport | Run behind HTTPS (see OPERATIONS.md). Set `FORGE_HSTS=1` when you do. |
| Browser protections | Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy. |
| Backups | Daily consistent database copies (14 kept) plus `npm run backup` on demand. |
| Tests | `npm test` covers sync, roles, approvals gate, password rules, lockout, two-step, notifications, ingest, files, scanning, speak-up, vendor portal, assistant, email (plain, STARTTLS, TLS) and single sign-on against stand-in services. `npm run test:browser` drives every module in a real browser and `node tests/a11y.js` runs axe-core. |

## Not in place yet

- Independent penetration test, SOC 2 or ISO 27001 certification, vulnerability disclosure programme. These are external.
- Encryption of the database and files at rest by the application (use an encrypted disk or managed volume).
- SAML single sign-on and SCIM user provisioning (OpenID Connect is supported).
- The Content-Security-Policy still allows inline scripts and `eval` because the app is a single-page script bundle. Tightening this needs a build step.
- Server-side session revocation (tokens are valid until they expire; switching a user off blocks them on the next request).
- Tamper-evident hashing of audit entries.
- QR codes for authenticator setup (the key and an `otpauth` link are shown instead).
- Postgres for high availability.

The automated accessibility check (axe-core, WCAG A and AA rules) finds no serious or critical issues on 31 screens. Automated checks catch only part of what a screen-reader user meets; commission a manual audit before claiming WCAG conformance.

## E-signature

What it is: a **simple electronic signature with an audit trail**. A signer opens the exact document version, agrees to sign electronically, and types or draws their name. The system records who, when, how, the document's SHA-256 checksum, a hash of each signature record and a seal over all of them. It is **not** an Aadhaar eSign, a digital signature certificate (DSC) or a qualified or advanced electronic signature, and it does not by itself prove who the signer is. Whether it is legally sufficient depends on the document type and the law that applies (for example some documents need a licensed provider, witnesses or stamping). **Confirm sufficiency per document type with Legal** and use a licensed provider where the law or the counterparty requires one. The screens and the certificate say so.

- **Internal signers** sign in the app after signing in; the signature is made by their own account, in order if the request is sequential.
- **External signers** have no account. An administrator or the requester creates a private link (`/sign.html?t=...`) for one person. The link is 32 random bytes (base64url); only its SHA-256 hash is stored (table `sign_tokens`); it is valid until the request due date plus one day, works for one submission, and a new link for the same person revokes the older ones. Anyone holding the link can sign as that person, so send it only to them (by email or a channel they control). Wrong, expired or used links all get the same generic message; the endpoints are rate limited per address and an extra limit applies to bad tokens.
- **Integrity**: before showing the document to an external signer, and again before accepting a signature, the server re-reads the stored file and compares its SHA-256 with the checksum recorded when signing was requested. If they differ the document is not shown, the signature is refused, and the refusal is written to the audit trail and sent to the requester. Signed documents are locked against new versions and deletion. "Verify integrity" on a request recomputes the file checksum, every signature record (including the drawn image) and the seal.
- **Server gate**: changes to signature requests made through the normal sync are checked on the server. Nobody can sign, decline or edit for someone else (not even an administrator), external signers' entries can only be written by the signing portal, the recorded checksum and signer list are frozen, history can only grow, a seal must recompute, and completed requests are frozen. Auditors are read-only; function users cannot create requests.
- **Audit trail**: link issue, document download, signature, decline, refusal and completion are recorded with the actor (`External signer: <name>`), the IP address and the browser's user agent. Behind a reverse proxy set `FORGE_TRUST_PROXY=1` so the address is the signer's and not the proxy's.
- **Known limits**: the timestamp of an internal signature comes from the signer's browser clock (the server does not re-stamp it); the audit trail is not itself hash-chained; drawn images are small PNGs checked for type and size (60,000 characters), not for content; a typed or drawn name is evidence of intent, not of identity. Strong identity proofing (one-time codes, ID checks) is not built.

## Reporting a vulnerability

Email the address your organisation designates as the security contact. Do not open a public issue.
