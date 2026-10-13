// Regulatory library: Canada. Plain-language summaries for planning and mapping, NOT legal text.
// Each framework carries a verify note: confirm wording, dates and applicability against the official source.
// Status reflects research to 13 Oct 2026. References are topical labels unless a section/guideline number was seen in a source.
(function(){
const L=window.GRC_LIB;if(!L)return;
L.frameworks.push(
 {id:'ca-pipeda',code:'PIPEDA',name:'Personal Information Protection and Electronic Documents Act and Breach of Security Safeguards Regulations (SOR/2018-64)',kind:'Law',region:'Canada',jur:['CA'],sectors:['Privacy (cross-industry)','All'],issuer:'Government of Canada / Office of the Privacy Commissioner of Canada',
  summary:'Federal private-sector privacy law built on ten fair information principles in Schedule 1. It covers organisations collecting, using or disclosing personal information in the course of commercial activity, except where a provincial law (Quebec, British Columbia, Alberta) applies. Bill C-36 (Protecting Privacy and Consumer Data Act) was introduced on 15 June 2026 to replace its privacy provisions but is a bill only, not law.',
  verify:'Confirm the current consolidated Act and SOR/2018-64, the OPC guidance on meaningful consent and breach reporting, and the live parliamentary status of Bill C-36 before relying on it.',
  obl:[
  ['Schedule 1','Accountability and privacy governance','Designate someone accountable for compliance, keep policies and practices in place, and protect information handed to service providers by contract.','GOV'],
  ['Schedule 1','Identify purposes and obtain meaningful consent','State why personal information is collected before or at collection and get appropriate consent; purposes must also be ones a reasonable person would consider appropriate.','PRIV'],
  ['Schedule 1','Limit collection, use, disclosure and retention','Collect only what is needed for the identified purposes, use it only for those purposes, and keep it only as long as required to serve them.','PRIV'],
  ['Schedule 1','Accuracy and safeguards','Keep information accurate, complete and current for the use made of it, and protect it with safeguards appropriate to its sensitivity.','SEC'],
  ['Schedule 1','Openness, access and challenging compliance','Make privacy practices easy to find, give individuals access to and correction of their information, and run a process to handle complaints.','CONDUCT'],
  ['Breach regulations','Assess real risk of significant harm','For each breach of security safeguards, assess sensitivity of the information and probability of misuse to decide whether a real risk of significant harm exists.','INC'],
  ['Breach regulations','Report to the Commissioner and notify individuals','Where real risk of significant harm exists, report to the Privacy Commissioner and notify affected individuals as soon as feasible, and tell other organisations that can reduce harm.','INC'],
  ['Breach regulations','Keep breach records for 24 months','Keep a record of every breach of security safeguards, whether or not it meets the harm threshold, for 24 months after the breach occurred; the Commissioner can request them.','DISC']]},

 {id:'ca-quebec-law25',code:'Quebec Law 25',name:'Act to modernize legislative provisions as regards the protection of personal information (Law 25) amending the Quebec private-sector privacy Act',kind:'Law',region:'Canada',jur:['CA'],sectors:['Privacy (cross-industry)','All'],issuer:'Government of Quebec / Commission d’accès à l’information (CAI)',
  summary:'Quebec privacy reform in force in phases: governance and confidentiality incident rules from 22 September 2022, most other provisions from 22 September 2023, and data portability from 22 September 2024 (dates per secondary sources). It applies to enterprises handling personal information in Quebec, including those established elsewhere.',
  verify:'Confirm phase dates, the amended private-sector Act text and CAI guidance against official sources (Publications du Québec, CAI); penalty amounts and exact notice and PIA content were not verified here.',
  obl:[
  ['Governance','Designate a person in charge of privacy','Appoint a person responsible for protecting personal information (by default the highest authority) and publish governance policies and practices, including how complaints are handled.','GOV'],
  ['Incidents','Confidentiality incident response and register','Take reasonable steps to reduce harm and prevent recurrence, notify the CAI and affected individuals where there is a risk of serious injury, and keep a register of all incidents.','INC'],
  ['Consent','Clear, specific consent and transparency','Obtain consent that is clear, free and informed, tied to specific purposes, and publish a plain-language privacy policy that explains collection, use and rights.','PRIV'],
  ['Impact assessment','Privacy impact assessment for projects','Carry out a privacy impact assessment for projects to acquire, develop or overhaul information or electronic service delivery systems handling personal information.','RISK'],
  ['Transfers','Assessment before transfers outside Quebec','Before communicating personal information outside Quebec, assess whether it would receive adequate protection under generally recognised principles and document the result.','PRIV'],
  ['Automated decisions','Notice for decisions based on automated processing','Tell individuals when a decision is based exclusively on automated processing and, on request, explain the information used, the reasons and how to have it reviewed.','AI'],
  ['Rights','De-indexation, access, rectification and portability','Support individual rights including access and correction, requests to cease dissemination or de-index, and portability of computerised information in a structured, commonly used format.','PRIV'],
  ['Safeguards','Security measures and retention limits','Apply security measures proportionate to sensitivity, destroy or anonymise personal information once its purposes are fulfilled, and control access to what is needed.','SEC']]},

 {id:'ca-pipa-ab-bc',code:'Alberta and BC PIPA',name:'Alberta Personal Information Protection Act and British Columbia Personal Information Protection Act',kind:'Law',region:'Canada',jur:['CA'],sectors:['Privacy (cross-industry)','All'],issuer:'Province of Alberta and Province of British Columbia / Offices of the Information and Privacy Commissioners',
  summary:'Provincial private-sector privacy statutes treated as substantially similar to PIPEDA for organisations operating within Alberta and British Columbia. Alberta requires breach reporting to its Commissioner where a real risk of significant harm exists; sources reviewed indicated BC breach notification under PIPA remained voluntary.',
  verify:'Confirm current consolidated text of each Act, any BC PIPA amendments adding breach notification or a privacy management programme, and the Alberta breach regulation requirements for notice content.',
  obl:[
  ['Accountability','Responsibility for personal information and policies','Be responsible for personal information under your control, designate someone to ensure compliance, and develop and follow policies and practices that meet the Act.','GOV'],
  ['Consent','Notice, purposes and consent','Collect, use and disclose personal information only for reasonable purposes, with required notice and consent or a statutory exception, and limit it to what is reasonable.','PRIV'],
  ['Safeguards','Reasonable security arrangements','Protect personal information with reasonable security arrangements against unauthorised access, collection, use, disclosure, copying, modification or disposal.','SEC'],
  ['Alberta s.34.1','Breach reporting to the Alberta Commissioner','Notify the Alberta Commissioner without unreasonable delay of an incident where a reasonable person would find a real risk of significant harm to an individual.','INC'],
  ['Alberta s.37.1','Notification of affected individuals','Expect the Commissioner to direct notice to individuals facing a real risk of significant harm; notify them in the required form and time, and keep supporting records.','INC'],
  ['Access and correction','Individual access and correction requests','Respond to requests for access to and correction of personal information, and to complaints, within the timelines and procedures set by the applicable Act.','CONDUCT'],
  ['Retention','Retention and accuracy','Keep personal information only as long as needed for legal or business purposes, make reasonable efforts to keep it accurate and complete, and dispose of it securely.','PRIV'],
  ['Service providers','Oversight of service providers','Remain responsible for personal information handled by service providers and ensure contracts and oversight maintain equivalent protection.','TPR']]},

 {id:'ca-health-privacy',code:'PHIPA and provincial health privacy',name:'Ontario Personal Health Information Protection Act (PHIPA) and other provincial health privacy statutes',kind:'Law',region:'Canada',jur:['CA'],sectors:['Healthcare','Pharma & life sciences'],issuer:'Provinces and territories / provincial information and privacy commissioners (Ontario IPC)',
  summary:'Provincial laws governing personal health information held by health information custodians and their agents, including Ontario PHIPA, the Alberta Health Information Act, and the Newfoundland and Labrador and Nova Scotia Personal Health Information Acts. Ontario also requires breach notification to the IPC in prescribed cases and annual breach statistics, with administrative monetary penalties available since 1 January 2024.',
  verify:'Confirm requirements for each province in which you operate, Ontario Regulation 329/04 breach categories, current IPC statistics submission rules, and the status of Quebec health information legislation (not confirmed here).',
  obl:[
  ['PHIPA','Custodian accountability and information practices','Designate a contact person, maintain written information practices and a public statement describing them, and make custodians answerable for agents handling health information.','GOV'],
  ['PHIPA','Consent and permitted uses and disclosures','Collect, use and disclose personal health information only with consent or a legislated exception, and within the purposes you have identified.','PRIV'],
  ['PHIPA','Safeguards for health information','Take reasonable steps to protect health information against theft, loss and unauthorised use or disclosure, and keep records secure through retention and disposal.','SEC'],
  ['PHIPA breach','Notify individuals and the IPC of breaches','Notify affected individuals at the first reasonable opportunity of unauthorised use or disclosure, and notify the Ontario IPC at the first reasonable opportunity in the prescribed circumstances.','INC'],
  ['PHIPA reporting','Annual breach statistics to the IPC','Submit annual counts of lost, stolen, or inappropriately used or disclosed health information to the Ontario IPC through its online statistics process.','DISC'],
  ['Individual rights','Access and correction of health records','Give individuals access to and the ability to request correction of their health records, and respond within statutory timelines.','CONDUCT'],
  ['Other provinces','Alberta, NL and Nova Scotia health information duties','Where you operate in other provinces, apply their health information statutes as well, as each sets its own custodian duties and oversight by the provincial commissioner.','PRIV']]},

 {id:'ca-casl',code:'CASL',name:'Canada’s Anti-Spam Legislation (CASL)',kind:'Law',region:'Canada',jur:['CA'],sectors:['Retail & e-commerce','IT / Corporate','Cloud & SaaS','Telecom','All'],issuer:'Government of Canada / CRTC, Competition Bureau and Office of the Privacy Commissioner',
  summary:'Federal law regulating commercial electronic messages sent to or from Canada. Senders need consent, must identify themselves, and must provide a working unsubscribe mechanism. The sender bears the burden of proving consent.',
  verify:'Confirm against the Act, its regulations and current CRTC and ISED guidance, including the rules on computer program installation and the private right of action status, which were not reviewed here.',
  obl:[
  ['Consent','Express or implied consent before sending','Do not send commercial electronic messages without express consent or valid implied consent; the sender is responsible for proving consent.','PRIV'],
  ['Implied consent','Track expiry of implied consent','Implied consent from a relationship lapses after a set period (guidance cites two years or six months depending on the circumstance) unless withdrawn earlier, so track the clock.','PRIV'],
  ['Identification','Identify the sender and give contact details','Identify the person sending and the person on whose behalf the message is sent, and include mailing address plus phone, email or web contact details.','CONDUCT'],
  ['Unsubscribe','Working unsubscribe mechanism','Include a clear, prominent, no-cost unsubscribe mechanism and honour withdrawal requests within 10 business days.','CONDUCT'],
  ['Contact validity','Keep contact information valid','Keep the contact and unsubscribe details in messages working for at least 60 days after sending.','CONDUCT'],
  ['Records','Evidence and consent records','Keep records of when, how and what consent was obtained and of unsubscribe requests handled, so you can prove compliance on request.','DISC'],
  ['Third parties','Control messaging by vendors and partners','Make contracts and monitoring ensure marketing agencies and referral partners sending on your behalf follow consent and unsubscribe rules.','TPR']]},

 {id:'ca-osfi-b13',code:'OSFI B-13',name:'OSFI Guideline B-13 Technology and Cyber Risk Management (including incident reporting advisory)',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'OSFI expectations for federally regulated financial institutions on technology and cyber risk, organised in three domains: governance and risk management, technology operations and resilience, and cyber security. Effective 1 January 2024. A separate OSFI advisory on technology and cyber security incident reporting expects reports within 24 hours or sooner.',
  verify:'Confirm the principle-level wording of B-13 and the current Technology and Cyber Security Incident Reporting advisory (24-hour window, reporting form, definition) on osfi-bsif.gc.ca.',
  obl:[
  ['Domain 1','Technology and cyber governance','Senior management and the board set accountabilities, strategy and risk appetite for technology and cyber risk and keep oversight of how it is managed.','GOV'],
  ['Domain 1','Technology and cyber risk management framework','Identify, assess, manage, monitor and report technology and cyber risks within an integrated framework tied to enterprise risk management.','RISK'],
  ['Domain 2','Technology operations and asset management','Manage technology assets, change, projects and operations in a controlled way, with inventories and lifecycle management that support stable service.','RISK'],
  ['Domain 2','Technology resilience and recovery','Design and test technology so critical services can withstand and recover from disruption, including resilience of third-party technology services.','RES'],
  ['Domain 3','Cyber security programme','Operate cyber defences covering identify, defend, detect, respond, recover and learn, with security testing and remediation of weaknesses.','SEC'],
  ['Domain 3','Cyber security testing and assurance','Test the effectiveness of cyber controls through vulnerability management, penetration and scenario testing, and independent assurance.','TEST'],
  ['Incident advisory','Report technology and cyber incidents to OSFI within 24 hours','Notify OSFI Technology Risk Division and your Lead Supervisor in writing within 24 hours, or sooner, using the incident reporting form; mark unknown details as not yet available.','INC'],
  ['Incident advisory','Follow-up updates and post-incident review','Provide updates until the incident is resolved and complete a post-incident review, noting that reporting is encouraged where unsure whether an event qualifies.','INC']]},

 {id:'ca-osfi-e21',code:'OSFI E-21',name:'OSFI Guideline E-21 Operational Risk Management and Resilience',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'Finalised 22 August 2024, E-21 covers operational risk management and operational resilience for federally regulated financial institutions. Expectations were phased: some applied immediately, full adherence was expected by 1 September 2026 (now passed), and scenario testing of critical operations is expected to be completed by 1 September 2027.',
  verify:'Confirm the phased-implementation section and OSFI letter on dates, the exact section numbering, and how your institution is classified; the 2027 testing date came from the OSFI letter as reported in search results.',
  obl:[
  ['Governance','Operational risk governance and accountability','Board and senior management set clear accountability for operational risk and resilience, with a framework proportionate to the institution’s size and complexity.','GOV'],
  ['Operational risk','Identify, assess and control operational risk','Operate a framework to identify, assess, control, monitor and report operational risks, including events and losses, and escalate within risk appetite.','RISK'],
  ['Critical operations','Identify and map critical operations','Identify critical operations and map the people, processes, technology, data, facilities and third parties they depend on.','RES'],
  ['Tolerance','Set tolerances for disruption','Set tolerances for disruption for each critical operation as the maximum disruption you can withstand in severe but plausible scenarios, and manage within them.','RES'],
  ['Scenario testing','Scenario testing of critical operations','Develop a testing methodology and test critical operations against severe but plausible scenarios; testing was expected to be complete by 1 September 2027.','TEST'],
  ['Dependencies','Manage dependencies and third parties','Understand dependencies on third parties and technology that support critical operations and manage them consistently with B-10 and B-13.','TPR'],
  ['Incidents and continuity','Incident, continuity and recovery capability','Maintain incident management and business continuity arrangements able to restore critical operations within tolerance, and learn from events and tests.','INC'],
  ['Assurance','Independent review and board reporting','Review the operational risk and resilience programme independently and report results and remediation progress to senior management and the board.','TEST']]},

 {id:'ca-osfi-b10',code:'OSFI B-10',name:'OSFI Guideline B-10 Third-Party Risk Management',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'Final guideline published April 2023 and effective 1 May 2024, replacing the earlier outsourcing guideline. It covers third-party arrangements broadly, not only outsourcing, with a risk-based approach. Legacy arrangements are to be updated at the earliest renewal or revision. Foreign bank and insurer branches adhere to the extent consistent with Canadian obligations (by 31 March 2025).',
  verify:'Confirm the outcomes and principles, the transition for legacy arrangements and the amended foreign-branch application on osfi-bsif.gc.ca; the number of principles cited came from secondary law-firm summaries.',
  obl:[
  ['Governance','Third-party risk management framework','Maintain an enterprise-wide framework with accountabilities, policies and processes to identify, manage, mitigate, monitor and report third-party risk.','GOV'],
  ['Risk-based approach','Assess risk and criticality of arrangements','Apply controls in proportion to the risk and criticality of each arrangement rather than a fixed materiality threshold.','TPR'],
  ['Due diligence','Due diligence before engagement','Assess a prospective third party’s capability, security, resilience and financial strength before contracting, scaled to the risk.','TPR'],
  ['Agreements','Written agreements with required terms','Document arrangements in written agreements that address matters such as security, incident notification, audit and access rights, and subcontracting.','TPR'],
  ['Monitoring','Ongoing monitoring and reporting','Monitor third-party performance and risk continuously, address incidents proactively and report significant issues to senior management.','TPR'],
  ['Concentration','Concentration and subcontracting risk','Consider concentration risk and the chain of subcontractors that support your critical services.','SUPPLY'],
  ['Exit','Contingency and exit planning','Plan for disruption or failure of a third party, including stressed exit and transition options for critical arrangements.','RES'],
  ['Technology and cyber','Third-party technology and cyber risk','Extend technology and cyber risk controls, including cloud arrangements, to third parties as set out alongside B-13.','SEC']]},

 {id:'ca-osfi-e23',code:'OSFI E-23',name:'OSFI Guideline E-23 Model Risk Management (2027)',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'Final guideline published 11 September 2025 and effective 1 May 2027. Principles-based, it covers all types of models, including AI and machine learning, for banks, foreign bank branches, life, property and casualty insurers and trust and loan companies. Pension plans were removed from scope in the final version.',
  verify:'Confirm the final scope, definition of model, risk-rating expectations and outcome statements on osfi-bsif.gc.ca; the scope detail here came from law-firm summaries.',
  obl:[
  ['Governance','Enterprise-wide model risk governance','Establish accountability, policies and a model risk framework approved by senior management, proportionate to size, risk profile and complexity.','GOV'],
  ['Scope','Define models and keep a model inventory','Use a clear definition of model that includes AI and machine learning, and maintain a complete inventory of models in use.','RISK'],
  ['Risk rating','Rate model risk and scale controls','Assign each model a risk rating based on materiality and complexity and apply more intensive controls to higher-risk models.','AI'],
  ['Lifecycle','Control the model lifecycle','Manage models through design, data, development, validation, approval, deployment, monitoring and decommissioning with documented standards.','AI'],
  ['Validation','Independent validation and ongoing monitoring','Have models independently reviewed before use and monitor performance, drift and limitations on an ongoing basis.','TEST'],
  ['Data and explainability','Data quality and explainability','Ensure data used by models is fit for purpose and that outcomes can be explained to a degree commensurate with risk, including for AI/ML models.','AI'],
  ['Third-party models','Models developed by vendors','Apply model risk expectations to vendor and externally sourced models, including transparency and validation access.','TPR']]},

 {id:'ca-osfi-integrity-security',code:'OSFI Integrity and Security',name:'OSFI Integrity and Security Guideline',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'Guideline finalised 31 January 2024 supporting a legislated requirement, effective 1 January 2024, that federally regulated financial institutions have policies to guard against threats to their integrity and security. It addresses undue influence, foreign interference and malicious activity.',
  verify:'Confirm the final guideline text, implementation expectations and FAQ (OSFI stated not all elements, such as background checks, were required on 1 January 2024) on osfi-bsif.gc.ca.',
  obl:[
  ['Policies','Integrity and security policies and procedures','Maintain documented policies and procedures to guard against threats to the institution’s integrity or security, approved and overseen at the right level.','GOV'],
  ['Threat assessment','Assess threats such as foreign interference','Assess risks of undue influence, foreign interference and malicious activity affecting the institution, people, information and assets.','RISK'],
  ['People','Screening of staff and responsible persons','Use risk-based due diligence and screening for responsible persons, staff and contractors in sensitive roles.','SEC'],
  ['Information and assets','Protect sensitive information and assets','Safeguard sensitive information, systems and facilities against unauthorised access or influence in proportion to risk.','SEC'],
  ['Third parties','Integrity and security in third-party dealings','Consider integrity and security threats when selecting and monitoring third parties and when making significant investments or partnerships.','TPR'],
  ['Monitoring','Monitor, escalate and review','Monitor for integrity and security issues, escalate concerns to management, and review the approach regularly.','GOV']]},

 {id:'ca-osfi-b15',code:'OSFI B-15',name:'OSFI Guideline B-15 Climate Risk Management',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'Climate risk management and disclosure expectations, with the March 2024 revision aligning disclosure to IFRS S2. Effective at fiscal year-end 2024 for domestic systemically important banks and internationally active insurance groups headquartered in Canada, and fiscal year-end 2025 for others. OSFI later moved the Scope 3 disclosure expectation to align with CSSB standards (fiscal 2028).',
  verify:'Confirm current B-15 text, Annex 2-2 disclosure expectations, Climate Risk Return schedule and the OSFI letter on Scope 3 timing; third-party sites gave conflicting dates.',
  obl:[
  ['Governance','Board and senior management oversight of climate risk','Assign oversight and accountability for climate-related risks and opportunities, with competence and reporting lines appropriate to the institution.','GOV'],
  ['Strategy','Assess climate impact on strategy and business model','Identify how physical and transition climate risks affect strategy, business model and the balance sheet over short, medium and long horizons.','RISK'],
  ['Risk management','Integrate climate risk into risk management','Embed climate risk into the risk appetite, credit, market, liquidity, operational and insurance risk frameworks.','RISK'],
  ['Scenario analysis','Climate scenario analysis and stress testing','Use scenario analysis to test resilience of strategy and portfolios to climate pathways and incorporate results into planning.','TEST'],
  ['Disclosure','Climate-related disclosure aligned to IFRS S2','Disclose governance, strategy, risk management, metrics and targets as set by the guideline, including greenhouse gas emissions on the phased schedule.','DISC'],
  ['Regulatory return','Climate Risk Returns','Complete OSFI’s Climate Risk Returns when they apply to your institution’s fiscal year-end.','DISC']]},

 {id:'ca-osfi-corp-gov',code:'OSFI Corporate Governance',name:'OSFI Corporate Governance Guideline (2018)',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance'],issuer:'Office of the Superintendent of Financial Institutions (OSFI)',
  summary:'OSFI’s expectations on boards and senior management of federally regulated financial institutions. The board sets strategy, risk appetite and culture and oversees management and internal controls, while oversight functions such as risk, compliance and internal audit provide independent challenge.',
  verify:'Confirm the current guideline wording on board composition, the Chief Risk Officer, and oversight function independence on osfi-bsif.gc.ca.',
  obl:[
  ['Board role','Board sets strategy, risk appetite and culture','The board approves business plans and strategy, sets risk appetite and promotes a sound risk and ethical culture throughout the institution.','GOV'],
  ['Risk appetite','Board-approved Risk Appetite Framework','Approve and oversee an enterprise-wide Risk Appetite Framework and confirm management actions remain within it.','RISK'],
  ['Internal control','Internal Control Framework oversight','Approve and oversee the internal control framework and confirm controls are sound and effective.','GOV'],
  ['Senior management','Management implements board decisions','Senior management carries out board decisions and runs the institution within the approved strategy, policies and risk appetite.','GOV'],
  ['Oversight functions','Independent oversight functions','Maintain independent risk, compliance, finance, internal audit and actuarial functions with adequate stature and resources.','GOV'],
  ['Policies','Codes of conduct and key policies','The board approves codes of ethics and conduct and significant capital and liquidity policies and reviews them regularly.','GOV']]},

 {id:'ca-fintrac-pcmltfa',code:'PCMLTFA / FINTRAC',name:'Proceeds of Crime (Money Laundering) and Terrorist Financing Act and FINTRAC obligations',kind:'Law',region:'Canada',jur:['CA'],sectors:['BFSI','Insurance','Fintech & crypto','Real estate & construction'],issuer:'Government of Canada / Financial Transactions and Reports Analysis Centre of Canada (FINTRAC)',
  summary:'Canada’s anti-money laundering and anti-terrorist financing regime. Reporting entities (including banks, money services businesses and others) must run a compliance programme, identify clients, keep records and report prescribed transactions and suspicions to FINTRAC.',
  verify:'Confirm your sector obligations, current report forms and filing methods, record retention periods and ministerial directives against the PCMLTFA, its regulations and FINTRAC guidance; retention periods were not verified here.',
  obl:[
  ['Compliance programme','Compliance officer and written policies','Appoint a compliance officer and maintain written, up-to-date compliance policies and procedures, scaled to your size, complexity and risk exposure.','GOV'],
  ['Compliance programme','Risk assessment of business and clients','Assess money laundering and terrorist financing risk across clients, products, delivery channels and geography, and apply enhanced measures to high risk.','FC'],
  ['Compliance programme','Training programme and plan','Maintain a written, ongoing compliance training programme and plan for employees and agents.','FC'],
  ['Compliance programme','Two-year effectiveness review','Review and document the effectiveness of the programme at least every two years.','TEST'],
  ['Reporting','Suspicious transaction reports','Submit a report when there are reasonable grounds to suspect a transaction relates to money laundering or terrorist financing, as soon as practicable after completing the assessment.','FC'],
  ['Reporting','Large cash and international funds transfer reports','Report cash of $10,000 or more (including multiple amounts within 24 consecutive hours) and international electronic funds transfers of $10,000 or more; large cash reports are due within 15 calendar days.','FC'],
  ['Client identification','Know your client and beneficial ownership','Verify the identity of clients and beneficial owners using the methods the regulations permit, and apply additional measures for politically exposed persons.','FC'],
  ['Records','Record-keeping','Keep the transaction, identification and compliance records the regulations require, in a form that lets them be provided to FINTRAC promptly.','DISC']]},

 {id:'ca-csa-issuer-disclosure',code:'CSA NI 52-109 / NI 51-102',name:'CSA National Instrument 52-109 (Certification of Disclosure) and National Instrument 51-102 (Continuous Disclosure Obligations), with climate disclosure status',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','IT / Corporate','All'],issuer:'Canadian Securities Administrators (provincial and territorial securities regulators)',
  summary:'Rules for reporting issuers: NI 52-109 requires CEO and CFO certificates over annual and interim filings and internal controls, while NI 51-102 sets continuous disclosure including financial statements, MD&A and material change reports. National climate-related disclosure instrument NI 51-107 was proposed but, per secondary sources, work was paused in April 2025 and it is not in force.',
  verify:'Confirm the current consolidated instruments and forms, venture versus non-venture deadlines, and whether the CSA has resumed NI 51-107; non-venture filing deadlines and material change report timing were not verified in sources reviewed.',
  obl:[
  ['NI 52-109','CEO and CFO certification of filings','Certifying officers certify annual and interim filings, including that they have designed, or caused to be designed, disclosure controls and procedures and internal control over financial reporting.','DISC'],
  ['NI 52-109','Evaluate controls and disclose conclusions','Evaluate effectiveness of disclosure controls and internal control over financial reporting and disclose conclusions in the annual MD&A; venture issuers have reduced certificate content.','TEST'],
  ['NI 52-109','Disclose material weaknesses','Disclose each material weakness in internal control over financial reporting in MD&A, along with any remediation steps already taken.','DISC'],
  ['NI 51-102','Financial statements and MD&A','File annual and interim financial statements and MD&A within the deadlines for your issuer type (venture issuers: 120 days annual and 60 days interim).','DISC'],
  ['NI 51-102','Material change reports','File a material change report on the prescribed form when a material change occurs, alongside timely news release of material information.','DISC'],
  ['NI 51-102','Disclose material risks including cyber and climate','Describe material risks in required disclosure; CSA staff expect cyber and climate risks to be covered where material.','RISK'],
  ['Staff notice 51-347','Cybersecurity disclosure expectations','Follow CSA staff guidance on disclosing cybersecurity risks, incidents and governance by issuers.','SEC'],
  ['NI 51-107 status','Track climate disclosure instrument','NI 51-107 is a proposal, paused since April 2025, not in force; monitor developments and keep current disclosure of material climate risks.','DISC']]},

 {id:'ca-csa-ni31-103',code:'CSA NI 31-103',name:'CSA National Instrument 31-103 Registration Requirements, Exemptions and Ongoing Registrant Obligations (cybersecurity guidance)',kind:'Regulator direction',region:'Canada',jur:['CA'],sectors:['BFSI','Fintech & crypto'],issuer:'Canadian Securities Administrators (provincial and territorial securities regulators)',
  summary:'Registrant obligations for dealers, advisers and investment fund managers. The CSA treats cyber risk as part of the compliance system, controls and supervision duty in s.11.1, and has issued staff guidance (Staff Notice 33-321, 2017) on cyber risk practices.',
  verify:'Confirm current NI 31-103 text and recent CSA staff notices on cybersecurity (a 2026 staff notice was reported in one unverified source) on the CSA and provincial regulator websites.',
  obl:[
  ['s.11.1','Compliance system covers cyber risk','Maintain a system of controls and supervision that manages cyber risk as part of the firm’s compliance obligations.','GOV'],
  ['SN 33-321','Cyber policies and procedures','Maintain written policies and procedures to protect client information and firm systems from cyber threats.','SEC'],
  ['SN 33-321','Periodic cyber risk assessments','Perform regular risk assessments to identify cyber threats, vulnerabilities and consequences for the firm and its clients.','RISK'],
  ['SN 33-321','Employee training and awareness','Train employees on cyber risks and safe practices, including social media use, and reinforce through supervision.','SEC'],
  ['SN 33-321','Incident response plan','Prepare and test an incident response plan so the firm can detect, contain, recover from and communicate about cyber incidents.','INC'],
  ['SN 33-321','Vendor due diligence','Perform due diligence on third-party vendors that access client or firm data and require appropriate security terms.','TPR'],
  ['SN 33-321','Cyber insurance consideration','Consider cyber insurance as part of managing residual risk.','RISK']]},

 {id:'ca-bank-act-fcpf',code:'Bank Act FCPF',name:'Bank Act Financial Consumer Protection Framework and FCAC Guidelines',kind:'Law',region:'Canada',jur:['CA'],sectors:['BFSI'],issuer:'Government of Canada / Financial Consumer Agency of Canada (FCAC)',
  summary:'Consumer protection regime applying to federally regulated banks, supervised by the FCAC. Complaint-handling rules took effect 30 June 2022. FCAC published a revised complaint-handling guideline in June 2026 that, per law-firm commentary, takes effect in June 2027.',
  verify:'Confirm the effective date of the revised complaint-handling guideline and the other framework requirements (for example disclosure, sales practices, unsolicited products) on the FCAC and Bank Act texts; only complaint handling and governance were reviewed here.',
  obl:[
  ['Complaints','Broad definition of complaint','Treat any expression of dissatisfaction as a complaint and record it, whether or not the customer calls it a complaint or the bank considers it justified.','CONDUCT'],
  ['Complaints','56-day resolution limit','Resolve or close complaints within 56 days; the clock cannot be paused under the revised guideline.','CONDUCT'],
  ['Complaints','Procedures filed with FCAC and made available','File complaint-handling procedures with the FCAC, post them online, make them available in branches and provide them on request.','CONDUCT'],
  ['Complaints','Acknowledgement and decision notice','Promptly acknowledge complaints with next steps and give a formal notice of the final decision (revised guideline).','CONDUCT'],
  ['Complaints','Review complaint records for systemic issues','Review complaint records to find systemic issues and remediate them, rather than treating only formal complaints as in scope.','RISK'],
  ['Governance','Board committee oversight of consumer provisions','A board committee oversees compliance with the consumer provisions.','GOV'],
  ['Governance','Whistleblower programme','Maintain a programme for employees to report concerns about consumer-provision compliance.','GOV']]},

 {id:'ca-ccspa',code:'CCSPA (Bill C-8)',name:'Critical Cyber Systems Protection Act (Part 2 of Bill C-8, successor to Bill C-26) and Telecommunications Act amendments',kind:'Law',region:'Canada',jur:['CA'],sectors:['Telecom','Energy & utilities','Transport & logistics','BFSI'],issuer:'Government of Canada / Public Safety Canada, Communications Security Establishment and sector regulators',
  summary:'Bill C-8 is reported to have received Royal Assent on 15 June 2026. Part 1 amends the Telecommunications Act and is in force. Part 2, the CCSPA, starts only on a date set by order of the Governor in Council; as of September to October 2026 sources reported no order and an empty Schedule 2, so no operator classes are designated and no CCSPA duties apply yet.',
  verify:'Confirm Royal Assent, the statute citation, coming-into-force orders and Schedule 2 designations in the Canada Gazette and LegisInfo; sources conflicted on incident reporting timing and penalty amounts, so neither is stated here.',
  obl:[
  ['Status','CCSPA not yet in force','Track Governor in Council orders and Schedule 2 designations; duties below apply only to designated operators once Part 2 is in force.','GOV'],
  ['Cyber security programme','Establish a documented cyber security programme','Designated operators must set up a documented programme covering risk management, protection, detection and minimising impact of incidents on vital systems.','SEC'],
  ['Supply chain','Manage supply chain and third-party risk','The programme is expected to address supply chain and third-party risk to critical cyber systems.','SUPPLY'],
  ['Incident reporting','Report cyber security incidents','Designated operators must report cyber security incidents affecting vital services or critical cyber systems to the Communications Security Establishment and their regulator, as set by regulation.','INC'],
  ['Telecom','Telecommunications Act security orders','Telecommunications service providers must follow binding orders issued under the amended Telecommunications Act, including network vulnerability assessments ordered by the Minister.','SEC'],
  ['Compliance','Comply with regulator directions','Follow cyber security directions issued under the Act and cooperate with regulators.','GOV']]},

 {id:'ca-ai-legislation',code:'Canada AI legislation status',name:'Canadian AI legislation status (former Artificial Intelligence and Data Act, AIDA)',kind:'Framework',region:'Canada',jur:['CA'],sectors:['All','IT / Corporate','Cloud & SaaS','BFSI'],issuer:'Government of Canada / provincial governments',
  summary:'AIDA, Part 3 of Bill C-27, is not law: the bill died on the Order Paper when Parliament was prorogued on 6 January 2025. Canada has no horizontal federal AI statute; the government has indicated AIDA will not return as drafted. Related binding rules sit elsewhere (Quebec Law 25, OSFI E-23, sector regulators).',
  verify:'Confirm on LegisInfo and Canada.ca that no federal AI bill has since been introduced or passed, and check the status of Ontario’s AI disclosure rule and the voluntary national AI strategy, which came from secondary sources.',
  obl:[
  ['Status','Do not treat AIDA as law','AIDA was never enacted; do not cite it as a legal duty and monitor for any replacement federal framework.','GOV'],
  ['Inventory','Maintain an inventory of AI systems','Keep a register of AI and automated decision systems so obligations from privacy, sector and future AI law can be mapped quickly.','AI'],
  ['Quebec','Automated decision notice under Law 25','Where decisions are made exclusively by automated processing of Quebec personal information, give the notice and explanation rights set out in Quebec law.','AI'],
  ['OSFI','Model risk controls for financial institutions','Federally regulated financial institutions apply OSFI Guideline E-23 (effective 1 May 2027) to AI and machine learning models.','AI'],
  ['Ontario','AI disclosure in job postings','Check Ontario employment rules requiring disclosure of AI use in screening job applicants where you recruit in Ontario.','AI'],
  ['Privacy','Privacy impact assessment for AI use','Run privacy assessments for AI that uses personal information, as expected under privacy laws and regulator guidance.','RISK']]},

 {id:'ca-labour-code-ohs',code:'Canada Labour Code Part II',name:'Canada Labour Code Part II (Occupational Health and Safety) and Work Place Harassment and Violence Prevention Regulations (SOR/2020-130)',kind:'Law',region:'Canada',jur:['CA'],sectors:['Transport & logistics','Telecom','BFSI','All'],issuer:'Government of Canada / Employment and Social Development Canada (Labour Program)',
  summary:'Federal workplace health and safety law applying to federally regulated employers such as banks, telecom, interprovincial transport and federal Crown corporations. Harassment and violence prevention duties were strengthened under Bill C-65 and the 2020 regulations.',
  verify:'Confirm Part II duties, Canada Occupational Health and Safety Regulations (hazard prevention, committees) and the harassment regulations; only the harassment regulations were reviewed here.',
  obl:[
  ['Part II','Employer duties to prevent and protect','Take the prescribed measures to prevent and protect against harassment and violence in the workplace, and respond to, investigate, record and report occurrences.','SAFETY'],
  ['SOR/2020-130','Joint harassment and violence prevention policy','Develop the workplace harassment and violence prevention policy jointly with the applicable partner, covering roles, responsibilities and prevention commitments.','GOV'],
  ['SOR/2020-130','Identify risk factors','Identify and assess the risk factors that contribute to harassment and violence and take preventive measures.','RISK'],
  ['Definition','Cover psychological and physical harm','Apply the Code definition of harassment and violence, including conduct reasonably expected to cause offence, humiliation, or physical or psychological injury.','SAFETY'],
  ['Records','Record and report occurrences','Keep records of occurrences and their handling and report them as the Code and regulations require.','DISC'],
  ['Hazards','Hazard prevention and joint committees','Maintain the hazard prevention measures and workplace health and safety committee or representative that Part II and its regulations require.','SAFETY']]},

 {id:'ca-competition-act-env',code:'Competition Act environmental claims',name:'Competition Act environmental claims (greenwashing) provisions',kind:'Law',region:'Canada',jur:['CA'],sectors:['All','Retail & e-commerce','BFSI'],issuer:'Government of Canada / Competition Bureau and Competition Tribunal',
  summary:'Greenwashing provisions added by Bill C-59 took effect 20 June 2024. Bill C-15 (Royal Assent 26 March 2026) narrowed them: claims about a business or its activities no longer need substantiation under internationally recognised methodology, and third parties cannot take those claims to the Tribunal. Product environmental benefit claims still need adequate and proper testing.',
  verify:'Confirm the consolidated Act, the in-force dates of the Bill C-15 amendments, and current Competition Bureau guidance; compliance-programme items were not found in sources and are not stated here.',
  obl:[
  ['Product claims','Substantiate product environmental claims','Environmental benefit claims about a product need adequate and proper testing before they are made.','CONDUCT'],
  ['Business claims','Business and activity claims','Claims about the environmental benefits of a business or its activities remain subject to the general false or misleading representation rules after the 2026 amendments.','CONDUCT'],
  ['General','Avoid false or misleading representations','Do not make materially false or misleading representations in marketing, sustainability reports or packaging.','CONDUCT'],
  ['Review','Pre-publication review of sustainability claims','Route green claims through legal or compliance review with evidence on file before they are published.','GOV'],
  ['Evidence','Keep evidence of testing and substantiation','Retain the testing, data and approvals behind each environmental claim so it can be produced to the Competition Bureau on request.','DISC'],
  ['Private action','Track private access changes','Private parties can still bring claims about product environmental benefits; third-party access for business-activity claims was removed.','RISK']]},

 {id:'ca-accessible-canada-act',code:'Accessible Canada Act',name:'Accessible Canada Act and Accessible Canada Regulations',kind:'Law',region:'Canada',jur:['CA'],sectors:['BFSI','Telecom','Transport & logistics','Government & defence'],issuer:'Government of Canada / Accessibility Commissioner and Canadian Human Rights Commission',
  summary:'Federal accessibility law aiming for a barrier-free Canada by 1 January 2040. Federally regulated entities must prepare an accessibility plan, set up a way to receive feedback and publish progress reports, in consultation with persons with disabilities.',
  verify:'Confirm entity-specific deadlines, the content requirements for plans and reports and the Accessible Canada Regulations, as sources reviewed were secondary or organisation reports.',
  obl:[
  ['Plan','Publish an accessibility plan','Prepare and publish an accessibility plan and update it every three years (the regulations can set different schedules).','GOV'],
  ['Consultation','Consult persons with disabilities','Develop plans and reports in consultation with persons with disabilities.','CONDUCT'],
  ['Feedback','Feedback process','Set up and publish a process to receive and respond to accessibility feedback, including anonymous feedback.','CONDUCT'],
  ['Progress report','Annual progress report','Publish a progress report each year describing progress on the plan and the feedback received and how it was considered.','DISC'],
  ['Notification','Notify the Accessibility Commissioner','Notify the Accessibility Commissioner when a progress report is published.','DISC'],
  ['Format','Plain language and accessible formats','Write plans and reports in plain, clear language and provide them in accessible formats.','CONDUCT']]},

 {id:'ca-cccs-baseline',code:'CCCS Baseline Controls',name:'Canadian Centre for Cyber Security Baseline Cyber Security Controls for Small and Medium Organizations',kind:'Framework',region:'Canada',jur:['CA'],sectors:['All','IT / Corporate'],issuer:'Canadian Centre for Cyber Security (Communications Security Establishment)',
  summary:'Voluntary guidance of 13 baseline controls for small and medium organisations that cannot adopt full ITSG-33 profiles, first released March 2019 and revised to version 1.2 in February 2020. It is not a legal requirement unless adopted by contract or programme.',
  verify:'Confirm the current version of the baseline controls and whether the Cyber Centre has superseded or updated it; control wording below is summarised from secondary sources.',
  obl:[
  ['Incident response','Incident response plan','Prepare and test a plan to detect, respond to and recover from cyber incidents.','INC'],
  ['Patching','Automatic patching','Apply operating system and application updates automatically or promptly.','SEC'],
  ['Security software','Security software and secure configuration','Use security software and configure devices securely.','SEC'],
  ['Authentication','Strong authentication and access control','Use strong user authentication and limit access to what each role needs.','SEC'],
  ['Awareness','Employee awareness training','Train staff to recognise phishing and unsafe practices.','SEC'],
  ['Backup','Backup and encryption','Back up important data and encrypt data where appropriate.','RES'],
  ['Perimeter and mobility','Perimeter defences, secure mobility, websites and portable media','Protect the network edge, mobile devices, websites and portable media.','SEC'],
  ['Cloud','Secure cloud and outsourced IT','Choose and configure cloud and outsourced IT services with appropriate security.','TPR']]},

 {id:'ca-rpaa',code:'RPAA',name:'Retail Payment Activities Act (RPAA) and Retail Payment Activities Regulations',kind:'Law',region:'Canada',jur:['CA'],sectors:['Fintech & crypto','BFSI'],issuer:'Government of Canada / Bank of Canada',
  summary:'Supervisory regime for payment service providers performing retail payment activities in Canada, overseen by the Bank of Canada. Per sources reviewed, the registration, operational risk, safeguarding, reporting and record-keeping requirements came into force on 8 September 2025.',
  verify:'Confirm the in-force dates, the final Bank of Canada guidelines on operational risk, incident notification and safeguarding (drafts were issued February 2024; finalisation was not confirmed) and the Regulations text.',
  obl:[
  ['Registration','Register with the Bank of Canada','Register before performing retail payment activities; applications are expected at least 60 days before activities begin.','GOV'],
  ['Operational risk','Operational risk and incident response framework','Establish, implement and maintain a framework to identify and mitigate operational risks and respond to incidents, limited to risks relevant to retail payment activities.','RISK'],
  ['Incident notification','Notify of incidents with material impact','Notify end users, other payment service providers, clearing houses and the Bank without delay of an incident with a material impact; investigate and document every incident.','INC'],
  ['Supervision','Bank assessment of framework','Expect the Bank to assess the framework and suggest corrective measures.','TEST'],
  ['Funds','Safeguard end-user funds','Safeguard end-user funds as required by the Act and regulations.','CONDUCT'],
  ['Reporting','Annual reports and significant change notices','File annual reports on the framework and notify the Bank of significant changes or new activities.','DISC'],
  ['Records','Record-keeping and supervisory information','Keep the records the Regulations require and provide supervisory information on request.','DISC']]},

 {id:'ca-cdba',code:'CDBA',name:'Consumer-Driven Banking Act (open banking) and proposed Consumer-Driven Banking Regulations',kind:'Law',region:'Canada',jur:['CA'],sectors:['BFSI','Fintech & crypto'],issuer:'Government of Canada / Department of Finance and Bank of Canada',
  summary:'Federal open banking framework. A secondary source reports the legislative framework was completed by Bill C-15 (Royal Assent 26 March 2026). Draft Consumer-Driven Banking Regulations were published in Canada Gazette Part I on 27 June 2026 (comments closed 26 August 2026); the regulations are proposed and not yet in force.',
  verify:'Confirm which Act sections are in force, final regulations, the technical standard and the oversight body in the Act and Canada Gazette, as only secondary summaries were reviewed.',
  obl:[
  ['Status','Regulations proposed only','Treat the framework as pending: plan for accreditation and compliance, but obligations apply only once the regulations and Act provisions are in force.','GOV'],
  ['Accreditation','Streamlined or full accreditation','Determine whether a streamlined or non-streamlined accreditation pathway applies, noting that RPAA compliance may help.','GOV'],
  ['Security','Security and authentication standards','Meet the draft requirements on security, national security and authentication for participants.','SEC'],
  ['Consent','Consent and transparency to consumers','Obtain and manage consumer consent for data sharing and give transparent information about what is shared.','PRIV'],
  ['Technical','Technical standards','Adopt the technical standards set for data sharing once finalised.','SEC'],
  ['Records','Reporting and record-keeping','Prepare to report and keep records as the final regulations require.','DISC'],
  ['Liability','Liability allocation','Review liability provisions in the draft regulations and reflect them in contracts and insurance.','RISK']]}
);

L.packs=L.packs||[];
L.packs.push(
 ['Canada · Banking and insurance (OSFI)','OSFI guidelines for federally regulated financial institutions: technology and cyber, resilience, third parties, models, climate, governance, integrity and security, and consumer protection.',['ca-osfi-b13','ca-osfi-e21','ca-osfi-b10','ca-osfi-e23','ca-osfi-integrity-security','ca-osfi-b15','ca-osfi-corp-gov','ca-bank-act-fcpf','ca-fintrac-pcmltfa','ca-ccspa','iso27001','nist-csf2']],
 ['Canada · Privacy (federal and provincial)','Federal and provincial private-sector privacy laws, breach duties and anti-spam rules.',['ca-pipeda','ca-quebec-law25','ca-pipa-ab-bc','ca-health-privacy','ca-casl','ca-ai-legislation','iso27701']],
 ['Canada · Securities issuers','Disclosure, certification and climate and cyber disclosure for reporting issuers and registrants.',['ca-csa-issuer-disclosure','ca-csa-ni31-103','ca-competition-act-env','ca-osfi-b15','ca-cccs-baseline']],
 ['Canada · Healthcare','Health privacy, security baseline and workplace safety for Canadian health providers.',['ca-health-privacy','ca-pipeda','ca-quebec-law25','ca-pipa-ab-bc','ca-cccs-baseline','ca-labour-code-ohs','ca-accessible-canada-act','iso27001']],
 ['Canada · Fintech and payments','Payment service provider, open banking, AML and privacy obligations for Canadian fintechs.',['ca-rpaa','ca-cdba','ca-fintrac-pcmltfa','ca-pipeda','ca-quebec-law25','ca-casl','ca-cccs-baseline','pci-dss','soc2','iso27001']],
 ['Canada · Critical infrastructure and federally regulated employers','Cyber, accessibility and workplace safety duties for telecom, energy, transport and other federally regulated employers.',['ca-ccspa','ca-cccs-baseline','ca-labour-code-ohs','ca-accessible-canada-act','ca-pipeda','nist-csf2','iso27001']]
);
})();
