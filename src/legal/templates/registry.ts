import type { LegalTemplate } from "./types";

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    id: "regular_bail_bnss",
    title: "Application for Regular Bail under Section 483 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
    category: "bail",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 439 CrPC, 1973]",
    sections: ["Section 483 BNSS, 2023", "Section 480 BNSS, 2023"],
    applicableCourt: "Court of Sessions / High Court",
    keyPrecedents: [
      "Satender Kumar Antil v. CBI, (2022) 10 SCC 51",
      "P. Chidambaram v. Directorate of Enforcement, (2019) 9 SCC 24 (Triple Test)",
      "Sanjay Chandra v. CBI, (2012) 1 SCC 40 (Bail is the rule, jail is an exception)",
    ],
    description: "Standard application for enlargement of accused on regular bail who is in judicial custody.",
    draftingChecklist: [
      "Specify exact date of arrest and period of custody undergone",
      "State stage of investigation (charge-sheet filed or pending)",
      "Satisfy the Triple Test (no flight risk, no witness tampering, no evidence destruction)",
      "Mention lack of criminal antecedents and deep roots in society",
      "Undertaking to furnish solvent local sureties and comply with conditions",
    ],
    templateText: `IN THE COURT OF THE PRINCIPAL DISTRICT AND SESSIONS JUDGE AT [DISTRICT/CITY]

CRIMINAL MISCELLANEOUS BAIL APPLICATION NO. ______ OF 202[ ]

IN THE MATTER OF:
[NAME OF ACCUSED/APPLICANT]
S/o [Father's Name], Aged about [__] years,
Residing at: [Full Residential Address]
(Presently lodged in Central/District Prison at [Location])
... APPLICANT / ACCUSED

VERSUS

STATE OF [NAME OF STATE]
Represented by the Station House Officer,
Police Station [Name of Police Station], [District]
(Through Public Prosecutor)
... RESPONDENT / PROSECUTION

FIR NO.: [__] / 202[ ]
POLICE STATION: [Name of Police Station]
OFFENSES UNDER SECTIONS: [e.g. Sections 103, 318(4), 61(2) of Bharatiya Nyaya Sanhita (BNS), 2023]

APPLICATION FOR ENLARGEMENT ON REGULAR BAIL UNDER SECTION 483 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023

MOST RESPECTFULLY SHOWETH:

1. That the Applicant is a law-abiding citizen of India, having deep roots in society, residing at the address set out hereinabove, and has no prior criminal antecedents whatsoever.

2. That the Applicant was arrested on [Date of Arrest] in connection with FIR No. [__] registered at Police Station [__] and has been in continuous judicial custody since [Date], having undergone over [__] days in detention.

3. BRIEF FACTS OF THE PROSECUTION CASE:
   (a) That the present FIR was registered on [Date] on the basis of a complaint made by [Name of Complainant] alleging [Briefly summarize allegations].
   (b) That the Applicant has been falsely implicated in the present case due to [State reason: business rivalry, civil dispute, matrimonial discord, or mistaken identity].

4. GROUNDS FOR REGULAR BAIL:
   A. FALSE IMPLICATION & INCONSISTENCY:
      That the Applicant is completely innocent and has had no role in the alleged incident. The allegations in the FIR do not prima facie establish the ingredients of the alleged offenses against the Applicant.

   B. NO CUSTODIAL INTERROGATION REQUIRED:
      That the police remand of the Applicant is already over, no recovery remains to be effected at the instance of the Applicant, and all relevant material/documents are already in the possession of the Investigating Agency.

   C. SATISFACTION OF TRIPLE TEST (P. Chidambaram v. ED):
      (i) No Flight Risk: The Applicant is a permanent resident, has family responsibilities, and has no intention of fleeing the course of justice.
      (ii) No Witness Tampering: The primary witnesses are official/independent witnesses, and the Applicant undertakes not to contact or influence any witnesses.
      (iii) No Tampering with Evidence: All evidence is documentary/electronic and already seized by the Investigating Officer.

   D. BAIL IS THE RULE, JAIL IS THE EXCEPTION (Satender Kumar Antil v. CBI):
      That continued incarceration of the Applicant pending trial would amount to pre-trial punishment, which violates Article 21 of the Constitution of India.

5. That the Applicant is ready and willing to furnish solvent local surety to the satisfaction of this Hon'ble Court and undertakes to abide by all terms and conditions that may be imposed.

PRAYER:
Wherefore, it is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Enlarge the Applicant on regular bail in FIR No. [__] / 202[ ] registered at Police Station [__] on such terms and conditions as deemed just and proper;
(b) Pass any other or further order(s) as this Hon'ble Court may deem fit in the interest of justice.

PLACE: [City]
DATE: [Date]

ADVOCATE FOR THE APPLICANT
[Name & Enrollment No.]`,
  },
  {
    id: "anticipatory_bail_bnss",
    title: "Application for Anticipatory Bail under Section 482 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
    category: "bail",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 438 CrPC, 1973]",
    sections: ["Section 482 BNSS, 2023", "Section 35(3) BNSS, 2023"],
    applicableCourt: "Court of Sessions / High Court",
    keyPrecedents: [
      "Gurbaksh Singh Sibbia v. State of Punjab, (1980) 2 SCC 565 (Constitution Bench)",
      "Sushila Aggarwal v. State (NCT of Delhi), (2020) 5 SCC 1 (Duration of pre-arrest protection)",
      "Arnesh Kumar v. State of Bihar, (2014) 8 SCC 273 (Notice requirements up to 7 yrs)",
    ],
    description: "Application for direction for grant of bail to a person apprehending arrest on false or motivated accusations.",
    draftingChecklist: [
      "Demonstrate reasonable and genuine apprehension of arrest",
      "Establish bona fides and absence of necessity for custodial interrogation",
      "Undertaking to make himself/herself available for interrogation whenever required under Section 35(3) BNSS",
      "Undertaking not to induce, threat, or promise to any person acquainted with facts",
    ],
    templateText: `IN THE COURT OF THE SESSIONS JUDGE / HIGH COURT OF JUDICATURE AT [LOCATION]

CRIMINAL MISC. ANTICIPATORY BAIL APPLICATION NO. ______ OF 202[ ]

IN THE MATTER OF:
[APPLICANT'S FULL NAME]
S/o [Father's Name], Aged about [__] years,
Residing at: [Full Address]
... APPLICANT

VERSUS

STATE OF [NAME OF STATE]
Represented by SHO, Police Station [Name], [District]
... RESPONDENT

FIR NO. (if registered): [__] / 202[ ]
POLICE STATION: [Name of Police Station]
OFFENSES UNDER: [Sections under BNS, 2023 or other Acts]

APPLICATION UNDER SECTION 482 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023 FOR GRANT OF ANTICIPATORY BAIL

MOST RESPECTFULLY SHOWETH:

1. That the Applicant has a reasonable and bona fide apprehension of being arrested by the Respondent Police in connection with FIR No. [__] / on the basis of a frivolous complaint lodged with Police Station [__].

2. That the Applicant has clean antecedents, is a respected member of society, and has never been involved in any criminal activity.

3. GROUNDS FOR PRE-ARREST BAIL:
   A. MALICIOUS & MOTIVATED ACCUSATION:
      The present complaint has been engineered with an oblique motive to harass, humiliate, and coerce the Applicant into settling a purely civil/monetary dispute.

   B. COMPLIANCE WITH SUSHILA AGGARWAL (2020) & SIBBIA (1980):
      As established by the Constitution Bench of the Hon'ble Supreme Court, anticipatory bail protects liberty against vexatious arrests. Custodial interrogation is not indispensable when the dispute is documentary.

   C. READY TO JOIN INVESTIGATION (Sec 35(3) BNSS):
      The Applicant undertakes to fully cooperate with the Investigating Officer as and when summoned.

PRAYER:
Wherefore, it is prayed that in the event of arrest in FIR No. [__] of Police Station [__], the Applicant be directed to be released on anticipatory bail on such terms and conditions as this Hon'ble Court deems fit.

DATE: [Date]
ADVOCATE FOR THE APPLICANT`,
  },
  {
    id: "default_bail_bnss",
    title: "Application for Statutory Default Bail under Section 187(2) of BNSS, 2023",
    category: "bail",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 167(2) CrPC]",
    sections: ["Section 187(2) BNSS, 2023"],
    applicableCourt: "Court of the Judicial Magistrate / Sessions Judge",
    keyPrecedents: [
      "Bikramjit Singh v. State of Punjab, (2020) 10 SCC 616",
      "Ritu Chhabaria v. Union of India, 2023 SCC OnLine SC 542",
      "Sanjay Dutt v. State through CBI, (1994) 5 SCC 410",
    ],
    description: "Application asserting indefeasible right to statutory default bail upon failure of police to file charge-sheet within 60/90 days.",
    draftingChecklist: [
      "Show exact date of first remand",
      "Calculate 60 days (for offenses up to 10 yrs) or 90 days (for life imprisonment / death / 10+ yrs)",
      "Confirm no charge-sheet / final report filed till filing of this application",
      "State applicant's readiness and willingness to furnish bail bond and surety",
    ],
    templateText: `IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE / METROPOLITAN MAGISTRATE AT [CITY]

CRIMINAL MISC. APPLICATION NO. ______ OF 202[ ]
IN
CRIME NO. / FIR NO.: [__] / 202[ ] OF POLICE STATION: [__]

IN THE MATTER OF:
[ACCUSED / APPLICANT NAME]
... APPLICANT

VERSUS

STATE OF [STATE NAME]
... RESPONDENT

APPLICATION UNDER SECTION 187(2) OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 FOR GRANT OF STATUTORY DEFAULT BAIL

MOST RESPECTFULLY SHOWETH:
1. That the Applicant was remanded to judicial custody on [Date of First Remand].
2. That the statutory period of [60 / 90] days prescribed under Section 187(2) BNSS expired on [Date of Expiry of Statutory Period].
3. That as on this date, the Investigating Agency has failed to submit its Final Police Report (Charge-Sheet) under Section 193 BNSS.
4. That the right to default bail under Section 187(2) BNSS is an indefeasible fundamental right under Article 21, as held in Bikramjit Singh v. State of Punjab.
5. That the Applicant is ready, willing, and prepared to furnish solvent surety as directed by this Court.

PRAYER:
Direct that the Applicant be released on statutory default bail under Section 187(2) of the BNSS, 2023.

ADVOCATE FOR THE APPLICANT`,
  },
  {
    id: "quashing_528_bnss",
    title: "Petition for Quashing FIR / Charge-Sheet under Section 528 of BNSS, 2023",
    category: "quashing",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 482 CrPC]",
    sections: ["Section 528 BNSS, 2023"],
    applicableCourt: "High Court of Judicature",
    keyPrecedents: [
      "State of Haryana v. Bhajan Lal, 1992 Supp (1) SCC 335 (The 7 Golden Categories)",
      "Neeharika Infrastructure Pvt. Ltd. v. State of Maharashtra, 2021 SCC OnLine SC 315",
      "Anand Kumar Mohatta v. State (NCT of Delhi), (2019) 11 SCC 706",
    ],
    description: "Petition invoking inherent jurisdiction of the High Court to quash malicious or legally unsustainable criminal proceedings.",
    draftingChecklist: [
      "Map facts directly into one or more of Bhajan Lal's 7 categories",
      "Show that allegations, even if taken at face value, do not disclose any cognizable offense",
      "Demonstrate abuse of court process or purely civil transaction dressed up as a criminal case",
      "Annex certified copies of FIR, impugned notices, and contractual evidence",
    ],
    templateText: `IN THE HIGH COURT OF JUDICATURE AT [BENCH/CITY]

CRIMINAL PETITION / MISC. PETITION NO. ______ OF 202[ ]

IN THE MATTER OF:
[PETITIONER NAME & PARTICULARS]
... PETITIONER

VERSUS

1. STATE OF [STATE]
   (Through Home Department / SHO Police Station [__])
2. [NAME OF DE-FACTO COMPLAINANT / INFORMANT]
... RESPONDENTS

PETITION UNDER SECTION 528 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 PRAYING FOR QUASHING OF FIR NO. [__] OF 202[ ]

MOST RESPECTFULLY SHOWETH:
1. That the Petitioner approaches this Hon'ble Court invoking its inherent jurisdiction under Section 528 BNSS to prevent the abuse of the process of law and secure the ends of justice.
2. GROUNDS:
   A. FALLS WITHIN CATEGORIES 1 & 7 OF BHAJAN LAL:
      The allegations made in the FIR, even if accepted in their entirety, do not prima facie constitute any offense against the Petitioner.
   B. CIVIL DISPUTE CLOAKED AS CRIMINAL OFFENSE:
      The dispute between Petitioner and Respondent No. 2 arises out of a commercial agreement dated [__], which is purely civil in nature.
PRAYER:
Quash FIR No. [__] / 202[ ] registered at Police Station [__] and all consequential proceedings arising thereunder.

ADVOCATE FOR THE PETITIONER`,
  },
  {
    id: "discharge_bnss",
    title: "Application for Discharge under Section 250 / 262 of BNSS, 2023",
    category: "discharge",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 227/239 CrPC]",
    sections: ["Section 250 BNSS, 2023 (Sessions)", "Section 262 BNSS, 2023 (Magistrate)"],
    applicableCourt: "Court of Sessions / Judicial Magistrate",
    keyPrecedents: [
      "Amit Kapoor v. Ramesh Chander, (2012) 9 SCC 460",
      "Sanjay Kumar Rai v. State of Uttar Pradesh, 2021 SCC OnLine SC 367",
      "Union of India v. Prafulla Kumar Samal, (1979) 3 SCC 4",
    ],
    description: "Application seeking discharge prior to framing of charges on the ground of groundless accusations.",
    draftingChecklist: [
      "Analyze prosecution witness statements under Sec 180 BNSS (Sec 161 CrPC)",
      "Show absolute absence of prima facie evidence or grave suspicion",
      "Demonstrate legal bar (e.g. lack of mandatory sanction under Sec 218 BNSS / Sec 197 CrPC)",
    ],
    templateText: `IN THE COURT OF THE [ADDITIONAL SESSIONS JUDGE / MAGISTRATE] AT [CITY]

CRIMINAL CASE NO. ______ OF 202[ ]
STATE VERSUS [NAME OF ACCUSED]

APPLICATION FOR DISCHARGE UNDER SECTION [250 / 262] OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

MOST RESPECTFULLY SHOWETH:
1. That taking all material submitted under Section 193 BNSS by the prosecution as gospel truth, no grave suspicion is disclosed against the Accused.
2. That the trial court is not a mere post office to frame charges blindly (Prafulla Kumar Samal).
PRAYER:
Discharge the Accused from the offenses alleged in Crime No. [__].

ADVOCATE FOR THE ACCUSED`,
  },
  {
    id: "section_138_ni_notice",
    title: "Statutory Demand Notice for Cheque Dishonour under Section 138 of Negotiable Instruments Act, 1881",
    category: "notices",
    act: "Negotiable Instruments Act, 1881",
    sections: ["Section 138 NI Act", "Section 142 NI Act"],
    applicableCourt: "Pre-litigation Statutory Notice (Mandatory prior to Magistrate Complaint)",
    keyPrecedents: [
      "Dashrath Rupsingh Rathod v. State of Maharashtra, (2014) 9 SCC 129",
      "Bir Singh v. Mukesh Kumar, (2019) 4 SCC 197",
    ],
    description: "Mandatory statutory demand notice issued within 30 days of cheque return memo giving 15 days to pay.",
    draftingChecklist: [
      "Detail of legally enforceable debt/liability",
      "Cheque details (Cheque No., Date, Drawee Bank, Amount)",
      "Bank return memo details (Date of return, Reason: 'Funds Insufficient')",
      "Clear demand giving strict 15 days from receipt of notice to make payment",
    ],
    templateText: `LEGAL DEMAND NOTICE
(UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881)

REGISTERED A.D. / SPEED POST / EMAIL

To,
[NAME OF DRAWER / ACCUSED]
[Full Residential / Office Address]

Sir / Madam,

Under instructions from and on behalf of my client, [NAME OF CLIENT / PAYEE], residing at [Client Address], I hereby serve upon you the following Statutory Notice:

1. That in discharge of your legally enforceable debt and liability towards my client for [describe transaction/goods/services], you issued Cheque bearing No. [__], dated [Date], drawn on [Bank Name], for an amount of Rs. [__,___]/- (Rupees [Amount in Words] only).

2. That my client presented the said cheque for encashment through their banker [Client's Bank Name], but the same was dishonoured and returned unpaid vide Bank Memo dated [Date] with the endorsement: "FUNDS INSUFFICIENT" / "EXCEEDS ARRANGEMENT".

3. That the said Return Memo was received by my client on [Date of Receipt].

4. I therefore call upon you to make payment of the said cheque amount of Rs. [__,___]/- to my client within 15 (FIFTEEN) DAYS from the receipt of this notice, failing which my client shall be constrained to initiate criminal proceedings against you under Section 138 read with Section 142 of the Negotiable Instruments Act, 1881, at your risk and consequence.

[ADVOCATE NAME & ADDRESS]`,
  },
  {
    id: "preserve_cctv_cdr_bnss",
    title: "Application for Preservation and Production of Call Detail Records (CDRs) and CCTV Footage under Section 94 BNSS, 2023",
    category: "evidence_applications",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Corresponding to Sec 91 CrPC]",
    sections: ["Section 94 BNSS, 2023", "Section 63 Bharatiya Sakshya Adhiniyam, 2023"],
    applicableCourt: "Court of the Judicial Magistrate / Sessions Judge",
    keyPrecedents: [
      "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal, (2020) 7 SCC 1",
      "Suresh Kumar v. State of Haryana, (2013) 16 SCC 353",
    ],
    description: "Urgent defense application to preserve tower locations, CDRs, and CCTV footage before automatic telecom overwrite.",
    draftingChecklist: [
      "Identify telecom providers (Airtel, Jio, Vi) and phone numbers",
      "Specify exact date and time frame of alibi",
      "Require certificate under Section 63 BSA (Section 65B IEA)",
      "Urgency notice: telecom data is erased/overwritten after 1-2 years",
    ],
    templateText: `IN THE COURT OF THE [MAGISTRATE / SESSIONS JUDGE] AT [CITY]

CRIMINAL MISC. APPLICATION NO. ______ OF 202[ ]
IN
FIR NO.: [__] / 202[ ] POLICE STATION: [__]

STATE VERSUS [NAME OF ACCUSED]

APPLICATION UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 READ WITH SECTION 63 OF BHARATIYA SAKSHYA ADHINIYAM, 2023 FOR PRESERVATION AND PRODUCTION OF CALL DETAIL RECORDS AND CCTV FOOTAGE

MOST RESPECTFULLY SHOWETH:
1. That the Applicant is arrayed as an accused in the aforementioned FIR, falsely implicating him in an incident alleged to have taken place on [Date] at [Time] at [Location].
2. That at the time of the alleged incident, the Applicant was present at [Alibi Location] and not at the scene of the crime.
3. That the Call Detail Records (CDRs), Cell Tower Location data of Mobile No. [__], and CCTV footage of [Location] from [Time] to [Time] on [Date] will establish the Applicant's complete innocence.
4. That telecom operators routinely overwrite raw CDR and location logs, creating grave urgency.
PRAYER:
Issue immediate directions to [Telecom Service Provider / CCTV Custodian] to preserve and produce the Call Detail Records and CCTV footage accompanied by a Certificate under Section 63 of Bharatiya Sakshya Adhiniyam, 2023.

ADVOCATE FOR THE APPLICANT`,
  },
];

export function listLegalTemplates(): LegalTemplate[] {
  return LEGAL_TEMPLATES;
}

export function getLegalTemplate(id: string): LegalTemplate | undefined {
  return LEGAL_TEMPLATES.find((t) => t.id.toLowerCase() === id.toLowerCase());
}

export function findTemplateForQuery(query: string): LegalTemplate | undefined {
  const q = query.toLowerCase();
  if (q.includes("anticipatory") && q.includes("bail")) return getLegalTemplate("anticipatory_bail_bnss");
  if (q.includes("default") && q.includes("bail")) return getLegalTemplate("default_bail_bnss");
  if (q.includes("bail")) return getLegalTemplate("regular_bail_bnss");
  if (q.includes("quash") || q.includes("528") || q.includes("482")) return getLegalTemplate("quashing_528_bnss");
  if (q.includes("discharge")) return getLegalTemplate("discharge_bnss");
  if (q.includes("138") || q.includes("cheque") || q.includes("dishonour") || q.includes("dishonor")) return getLegalTemplate("section_138_ni_notice");
  if (q.includes("cctv") || q.includes("cdr") || q.includes("preserve") || q.includes("preservation") || q.includes("tower")) {
    return getLegalTemplate("preserve_cctv_cdr_bnss");
  }
  return undefined;
}
