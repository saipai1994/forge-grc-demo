# Standard security questions: honest answers

Buyers often send a questionnaire (SIG, CAIQ or their own). These are answers for the software as it stands. Answers for hosting depend on where you deploy it. Update this file as items are completed.

| Question | Answer |
|---|---|
| Do you hold SOC 2 / ISO 27001? | No. Not started. Planned after the first paying customers. |
| Penetration test? | Not yet performed. |
| How are passwords stored? | scrypt with a per-user salt. |
| MFA? | Yes: authenticator-app codes (TOTP) with recovery codes; can be required for everyone. |
| SSO (SAML / OIDC)? | OpenID Connect (Entra ID, Okta, Google, Keycloak and others). SAML is not supported yet. |
| Role-based access? | Yes, four roles, enforced on the server. |
| Audit logging? | Yes: every change with user, time and field-level before/after; sign-ins, wrong codes, file access, speak-up access and assistant use. |
| Data encryption in transit? | Yes when deployed behind HTTPS (required). |
| Data encryption at rest? | Relies on the encrypted volume of the host. |
| Customer data separation? | Logical, by organisation, enforced on the server. |
| Backups? | Daily automatic, 14 retained; customer to copy off-site. |
| Data residency? | Chosen by where the customer or we host it. |
| Sub-processors? | None built in. Depends on hosting and any mail/chat relays configured. |
| Malware scanning of uploads? | Yes, with a ClamAV daemon you run; uploads are refused if the scanner is down. File-type allow-list and size limit as well. |
| Vulnerability management? | No dependencies to patch (the server uses only Node built-ins); runtime updates are the host's job. |
| Do you use AI on customer data? | Only if an administrator switches the assistant on by setting an API key. It is read-only, sends a summary of data the user can already see, and never files or speak-up reports. Without a key, no data leaves the server. |
| Whistleblowing channel? | Yes: anonymous web form, restricted inbox, two-code follow-up. |
| Incident response plan? | Template needed (to be written with counsel). |
| Data deletion at contract end? | On request: remove the organisation's records and files from the database and volume. A self-service export is planned. |
