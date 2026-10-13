# Readiness status

Updated with each release. "Built" means it is in this repository and tested; "Needs you" means it depends on something only the business can supply.

| Area | Status |
|---|---|
| Company profile, legal entities, business units, sites | Built (Organisation module) |
| Setup wizard, sample data or clean start | Built |
| Users: invite, role, switch off, password reset, forced change, lockout | Built |
| Shared data, live updates, record-level merge | Built |
| Audit trail | Built |
| Notifications (in-app, chat webhook, email relay hook) | Built; email needs a relay you provide |
| Evidence and record file attachments | Built; no virus scanning |
| CSV import (issues, controls, vendors, policies, losses, indicators) | Built |
| Board pack (print to PDF) | Built |
| Guide, keyboard access, small-screen layout | Built |
| Fiori-style Home launchpad, Overview cards, Horizon theme | Built |
| Backups and restore | Built (daily plus on demand) |
| Security overview, buyer questionnaire, ops runbook | Written |
| Privacy policy, terms, DPA | Drafts only. **Needs you** (lawyer) |
| Single sign-on, MFA | Not built. Needs an identity provider to build against |
| Connectors to Jira, ServiceNow, Okta and similar | Not built. Generic ingest API exists. Needs a design partner's system |
| Hosting, domain, HTTPS, encrypted volume | **Needs you** |
| Penetration test, SOC 2 / ISO 27001 | **Needs you** (external) |
| Library legal review and update process | **Needs you** (compliance professional) |
| Company registration, IP assignment, pricing, support process | **Needs you** |
| Postgres for many users or high availability | Not built; plan before hundreds of users |
| Native mobile apps | Not planned; the web app works on small screens |
