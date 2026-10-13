# Security overview

What the product does today, and what it does not. Use this as the starting point for buyer security reviews. It describes the software in this repository; the hosting you choose adds its own controls.

## In place

| Area | What exists |
|---|---|
| Sign-in | Email and password. Passwords hashed with scrypt and a per-user salt. Signed tokens that expire after 12 hours. |
| Password rules | At least 10 characters, letters plus numbers or symbols, common passwords refused, no name or email in the password. Administrator-set passwords are temporary and must be changed at first sign-in. |
| Lockout | 5 failed sign-ins lock an account for 15 minutes; per-address rate limit as well. Failed sign-ins are written to the audit trail. |
| Access control | Four roles. Permissions are checked on the server for every change; the browser cannot grant itself access. |
| Audit trail | Server-side, append-only in normal use: who changed which record, when, and which fields (old and new value). Sign-ins, user changes and file access are included. |
| Tenant separation | Every record and file is scoped to an organisation on the server. |
| Files | Type allow-list, 10 MB limit, stored outside the web root, downloaded only with a valid token, served as attachments with `nosniff`. SHA-256 recorded. |
| Transport | Run behind HTTPS (see OPERATIONS.md). Set `FORGE_HSTS=1` when you do. |
| Browser protections | Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy. |
| Backups | Daily consistent database copies (14 kept) plus `npm run backup` on demand. |
| Tests | `npm test` covers sign-in, lockout, roles, password rules, id collisions, field merge, notifications, ingest and file handling. |

## Not in place yet

- Single sign-on (SAML / OIDC) and multi-factor authentication.
- Encryption of the database and files at rest by the application (use an encrypted disk or managed volume).
- Virus scanning of uploaded files (add ClamAV or a cloud scanner before accepting files from outside your organisation).
- Email delivery of notifications (an outbox and a webhook relay exist; no built-in mail sending).
- Independent penetration test, SOC 2 or ISO 27001 certification, vulnerability disclosure programme.
- The Content-Security-Policy still allows inline scripts and `eval` because the app is a single-page script bundle. Tightening this needs a build step.
- Server-side session revocation (tokens are valid until they expire; switching a user off blocks them on the next request).
- Tamper-evident hashing of audit entries.

## Reporting a vulnerability

Email the address your organisation designates as the security contact. Do not open a public issue.
