# Running Forge GRC

Needs Node 22.13 or later. No packages to install.

## Start

```
npm start                 # http://localhost:8080
```

For a first production start, create the administrator instead of the demo users:

```
FORGE_ADMIN_EMAIL=you@company.com FORGE_ADMIN_NAME="Your Name" FORGE_ORG=acme npm start
```

The temporary password is printed once; you must change it at first sign-in.

## Settings (environment variables)

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default 8080) |
| `FORGE_DATA` | Folder for the database, files and backups. Put it on a persistent, encrypted volume. |
| `FORGE_SECRET` | Token signing secret. Set it to a long random value in production; if unset one is generated and stored in the database. |
| `FORGE_INGEST_KEY` | API key for `POST /api/ingest/kri`. Change it from the default. |
| `FORGE_ADMIN_EMAIL`, `FORGE_ADMIN_NAME`, `FORGE_ADMIN_PASSWORD`, `FORGE_ORG` | Create the first administrator instead of the demo accounts |
| `FORGE_SHOW_DEMO_LOGINS=0` | Hide the demo-accounts hint on the sign-in panel |
| `FORGE_WEBHOOK_URL` | Slack / Teams incoming webhook that receives every notification |
| `FORGE_MAIL_WEBHOOK` | URL that receives `{to, subject, text}` for each notification to a person, to relay as email |
| `FORGE_HSTS=1` | Send Strict-Transport-Security (only behind HTTPS) |
| `FORGE_BACKUP=0` | Turn off the built-in daily backup |
| `FORGE_TODAY` | Fix the date (demo only; leave unset for real use so due dates use the real calendar) |
| `FORGE_PUBLIC_URL` | The public address, for example `https://grc.example.com`. Needed for single sign-on redirects. |
| `FORGE_SMTP_URL` | Send notification email directly: `smtp://user:pass@host:587` (STARTTLS) or `smtps://user:pass@host:465` |
| `FORGE_MAIL_FROM` | From address, for example `Forge GRC <noreply@example.com>` |
| `FORGE_REQUIRE_MFA=1` | Everyone must set up two-step sign-in (authenticator app) |
| `FORGE_OIDC_ISSUER`, `FORGE_OIDC_CLIENT_ID`, `FORGE_OIDC_CLIENT_SECRET` | Single sign-on with any OpenID Connect provider (Entra ID, Okta, Google Workspace, Keycloak). Redirect URI to register: `<FORGE_PUBLIC_URL>/api/oidc/callback` |
| `FORGE_OIDC_PROVISION=1`, `FORGE_OIDC_ROLE`, `FORGE_OIDC_ORG` | Create accounts on first single sign-on, with this role (default Business user) |
| `FORGE_LOCAL_LOGIN=0` | Turn off password sign-in once single sign-on works |
| `FORGE_CLAMD_HOST`, `FORGE_CLAMD_PORT` | Scan uploaded files with a ClamAV daemon. Uploads are refused if the scanner is down, unless `FORGE_SCAN_FAILOPEN=1` |
| `ANTHROPIC_API_KEY`, `FORGE_MODEL` | Switch on the assistant. Without a key it shows a briefing computed from the data. |
| `FORGE_PUBLIC_ORG` | Organisation that receives anonymous speak-up reports (default `demo`; set to your `FORGE_ORG`) |
| `FORGE_WEBHOOK_URL` | Slack or Teams incoming webhook that receives every notification |
| `FORGE_MAIL_WEBHOOK` | Alternative to SMTP: a URL that receives `{to, subject, text}` for each notification |

## Pages people use without signing in

- `/report.html`: anonymous speak-up form. Reports are stored separately from the shared workspace and only administrators and auditors can read them.
- `/vendor.html?t=...`: a vendor answers a security questionnaire through a private link that an administrator or user issues from the vendor record. Links expire and work once for submission.

## Deploy

1. Build and run the container: `docker build -t forge-grc . && docker run -p 8080:8080 -v forge-data:/data -e FORGE_SECRET=... -e FORGE_ADMIN_EMAIL=... forge-grc`.
2. Put it behind a reverse proxy or load balancer that terminates HTTPS (Caddy, nginx, a cloud load balancer). Server-sent events need response buffering off (`proxy_buffering off` in nginx).
3. Choose a region that meets your customers' data-residency needs and an encrypted volume.
4. Run one instance. The database is SQLite; for several instances or high availability the data layer needs moving to Postgres.

## Backups and restore

- Automatic: `data/backups/forge-<time>.db`, daily, last 14 kept.
- On demand: `npm run backup`.
- Copy backups off the machine. Uploaded files live in `data/files/` and need copying too.
- Restore: stop the server, replace `data/forge.db` with a backup file, start it.

## Upgrading

Pull the new version, restart. The database adds columns and tables on start.

## Monitoring

`GET /api/health` returns 200 when the server is up. Point your uptime monitor at it. Logs go to standard output.

## Limits to know about

- One SQLite database: comfortable for dozens of users per organisation; plan the Postgres move before hundreds.
- Two people editing different fields of one record are merged; the same field is last-write-wins.
- Risks created in the original "New risk" form are shared; edits to existing built-in risks are not yet.
