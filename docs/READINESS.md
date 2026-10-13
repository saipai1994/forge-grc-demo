# Readiness status

Updated with each release. "Built" means it is in this repository and tested; "Needs you" means it depends on something only the business can supply.

| Area | Status |
|---|---|
| Company profile, legal entities, business units, sites; setup wizard; clean start | Built |
| Scope: tag records to entity, unit and site; whole app by scope | Built (risks, controls, issues, indicators, losses, policies, vendors; other registers are group-wide) |
| Settings: appetite, targets, currency, real-date mode | Built |
| Daily snapshots and real trends | Built (sample data gets clearly labelled illustrative history) |
| Risk acceptance with approval and expiry; treatment plans | Built |
| Events, policy exceptions, conflicts and gifts; confidential speak-up with public form | Built |
| Vendor questionnaires through private links; scoring; apply to vendor | Built |
| Audit workpapers: sampling, steps, exceptions, reviewer sign-off | Built |
| Library review workflow | Built (a person still has to do the review) |
| Fiori-style Home, Overview, Horizon theme | Built |
| Assistant | Built; live answers need `ANTHROPIC_API_KEY`; tested against a stand-in model |
| Users, roles, password rules, lockout | Built |
| Two-step sign-in (TOTP) | Built |
| Single sign-on (OpenID Connect) | Built; tested against a stand-in identity provider, not yet against Entra ID or Okta |
| Email (SMTP, plain, STARTTLS, TLS) | Built; tested against stand-in mail servers, not yet against a real provider |
| Virus scanning (ClamAV) | Built; tested against a stand-in daemon |
| Shared data, live updates, field-level merge, audit trail | Built |
| Notifications: in-app, chat webhook, email | Built |
| Files on records, CSV import, board pack | Built |
| Tables page long lists; keyboard access; phone layout; automated accessibility checks | Built |
| Tests and CI | `npm test`, `npm run test:browser`, GitHub Actions workflow |
| Backups and restore | Built (daily plus on demand) |
| Security overview, buyer questionnaire, operations guide | Written |
| Privacy policy, terms, DPA | Drafts only. **Needs you** (lawyer) |
| Connectors to Jira, ServiceNow, Okta and similar | Not built. Generic ingest API exists. Needs a design partner's system |
| SAML, SCIM | Not built |
| Hosting, domain, HTTPS, encrypted volume | **Needs you** |
| Penetration test, SOC 2 / ISO 27001, manual accessibility audit | **Needs you** (external) |
| Library legal review and update process | **Needs you** (compliance professional) |
| Company registration, IP assignment, pricing, support process | **Needs you** |
| Postgres for many users or high availability | Not built; plan before hundreds of users |
| Native mobile apps | Not planned; the web app works on small screens |
