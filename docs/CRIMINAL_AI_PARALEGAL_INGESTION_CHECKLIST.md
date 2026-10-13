# ⚖️ Criminal AI Paralegal — Corpus Ingestion Master Checklist

> 💡 **Workspace Context:** This document tracks the primary legal authorities, enactments, and judicial precedents required to calibrate Soli's RAG pipeline into an **Enterprise-grade Criminal Defense AI Paralegal**. Upload all assets via the Admin Console at `/admin/corpus`.

---

## 📌 Document Metadata

| Property | Value |
| :--- | :--- |
| **Workspace Target** | Soli Qdrant Vector Engine & PostgreSQL Metadata Store |
| **Jurisdiction** | India (Criminal Substantive & Procedural Law) |
| **Status** | 🟡 Ingesting (Phase 1 Baseline) |
| **Legal Regime** | New Criminal Acts (2023 Enactments) + Legacy Transition Concordance |
| **Target Document Count** | 35 Core Statutes & Landmark Authorities |
| **Last Reviewed** | October 2026 |

---

## 🌐 Official Document Repositories (Verified Sources)

> 🔗 **Ingestion Rule:** Download pure digital/text-selectable PDFs. Avoid scanned raster images unless processed with high-DPI OCR.

| Source Repository | Direct URL | Best For |
| :--- | :--- | :--- |
| **India Code Portal** | [indiacode.nic.in](https://www.indiacode.nic.in) | Central & State Bare Acts with latest amendments |
| **The Gazette of India** | [egazette.gov.in](https://egazette.gov.in) | Original Acts as enacted (Acts No. 45, 46, 47 of 2023) |
| **Supreme Court of India (e-SCR)** | [escr.sci.gov.in](https://escr.sci.gov.in) | Certified, official Supreme Court judgments & headnotes |
| **National eCourts Portal** | [judgments.ecourts.gov.in](https://judgments.ecourts.gov.in) | High Court criminal orders, bail decisions & quashing judgments |
| **PRS Legislative Research** | [prsindia.org](https://prsindia.org) | Section-by-section comparison tables (BNS ↔ IPC) |

---

## 🗂️ Master Ingestion Database (Table View)

| Priority | Document Title | Soli Collection | Core Legal Domain | Official Source | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| `P0` | **Bharatiya Nyaya Sanhita (BNS), 2023** | `statutes` | Substantive Penal Code | [India Code](https://www.indiacode.nic.in/handle/123456789/20062) | ⬜ To Ingest |
| `P0` | **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** | `statutes` | Procedural & Criminal Process | [India Code](https://www.indiacode.nic.in/handle/123456789/20063) | ⬜ To Ingest |
| `P0` | **Bharatiya Sakshya Adhiniyam (BSA), 2023** | `statutes` | Law of Evidence & Forensics | [India Code](https://www.indiacode.nic.in/handle/123456789/20064) | ⬜ To Ingest |
| `P0` | **BNS ↔ IPC Concordance & Comparative Chart** | `statutes` | Cross-Law Mapping | [PRS India](https://prsindia.org/billtrack/the-bharatiya-nyaya-sanhita-2023) | ⬜ To Ingest |
| `P0` | **Constitution of India (Articles 20, 21, 22, 32, 226)** | `constitutional` | Fundamental Rights & Writs | [Legislative Dept](https://cdnbbsr.s3waas.gov.in/s380537a945c7faf035e342f0c7ad64abd/uploads/2024/07/20240716890312078.pdf) | ⬜ To Ingest |
| `P1` | **Indian Penal Code (IPC), 1860** | `statutes` | Legacy Trials (Pre-July 2024) | [India Code](https://www.indiacode.nic.in/handle/123456789/2263) | ⬜ To Ingest |
| `P1` | **Code of Criminal Procedure (CrPC), 1973** | `statutes` | Legacy Procedure & Bail | [India Code](https://www.indiacode.nic.in/handle/123456789/1611) | ⬜ To Ingest |
| `P1` | **Indian Evidence Act (IEA), 1872** | `statutes` | Legacy Evidence & Sec 65B | [India Code](https://www.indiacode.nic.in/handle/123456789/2188) | ⬜ To Ingest |
| `P1` | **NDPS Act, 1985** | `statutes` | Narcotics & Sec 37 Bail Bar | [India Code](https://www.indiacode.nic.in/handle/123456789/1791) | ⬜ To Ingest |
| `P1` | **POCSO Act, 2012** | `statutes` | Child Protection & Presumptions | [India Code](https://www.indiacode.nic.in/handle/123456789/2079) | ⬜ To Ingest |
| `P1` | **PMLA, 2002** | `statutes` | Money Laundering & Sec 45 Bail | [India Code](https://www.indiacode.nic.in/handle/123456789/1936) | ⬜ To Ingest |
| `P1` | **Negotiable Instruments Act (Sec 138-147)** | `statutes` | Cheque Dishonor Litigation | [India Code](https://www.indiacode.nic.in/handle/123456789/2189) | ⬜ To Ingest |
| `P1` | **Information Technology Act, 2000** | `statutes` | Cyber Crime & Data Forensics | [India Code](https://www.indiacode.nic.in/handle/123456789/1999) | ⬜ To Ingest |
| `P1` | **SC/ST (Prevention of Atrocities) Act, 1989** | `statutes` | Special Atrocities & Sec 18 Bar | [India Code](https://www.indiacode.nic.in/handle/123456789/1422) | ⬜ To Ingest |

---

## 🏛️ Judicial Precedents & Landmark Authorities

<details open>
<summary><b>🔹 Category A: Arrest, Remand & Custody Compliance</b></summary>

> 📌 *Focus:* Ensuring notice requirements under Section 35(3) BNSS / 41A CrPC, grounds of arrest, and detention checklists.

- [ ] `P0` **Arnesh Kumar v. State of Bihar, (2014) 8 SCC 273**
  - *Key Takeaway:* Mandatory Notice of Appearance for offenses punishable up to 7 years. Magistrates must not authorize mechanical detention without recorded satisfaction.
  - *Download:* [SC e-SCR Citation Search](https://escr.sci.gov.in)
- [ ] `P0` **Satender Kumar Antil v. CBI, (2022) 10 SCC 51**
  - *Key Takeaway:* Comprehensive four-category classification of offenses (A, B, C, D) and guidelines directing bail without taking accused into custody.
  - *Download:* [SC e-SCR Portal](https://escr.sci.gov.in)
- [ ] `P1` **D.K. Basu v. State of West Bengal, (1997) 1 SCC 416**
  - *Key Takeaway:* 11-point mandatory guidelines for arrest, inspection memo, preparation of arrest memo, and next-of-kin notification.
- [ ] `P1` **Pankaj Bansal v. Union of India, 2023 SCC OnLine SC 1244**
  - *Key Takeaway:* Furnishing written grounds of arrest to the accused at the time of arrest is non-negotiable.
</details>

<br />

<details open>
<summary><b>🔹 Category B: Bail Jurisprudence (Regular, Anticipatory & Default)</b></summary>

> 📌 *Focus:* Anticipatory bail duration, triple test standards, and non-extendable statutory default bail timelines under Section 187 BNSS / 167(2) CrPC.

- [ ] `P0` **Gurbaksh Singh Sibbia v. State of Punjab, (1980) 2 SCC 565**
  - *Key Takeaway:* Five-judge Constitution bench holding that anticipatory bail cannot be subjected to artificial temporal limitations.
- [ ] `P0` **Sushila Aggarwal v. State (NCT of Delhi), (2020) 5 SCC 1**
  - *Key Takeaway:* Anticipatory bail does not automatically expire upon charge-sheet or framing of charges; protection can continue till end of trial.
- [ ] `P0` **P. Chidambaram v. Directorate of Enforcement, (2019) 9 SCC 24**
  - *Key Takeaway:* The "Triple Test" for bail: flight risk, witness tampering, evidence destruction. Gravity of offense alone cannot be sole consideration.
- [ ] `P0` **Bikramjit Singh v. State of Punjab, (2020) 10 SCC 616**
  - *Key Takeaway:* Indefeasible fundamental right to default bail if investigation is incomplete within the statutory 60/90 days period.
</details>

<br />

<details open>
<summary><b>🔹 Category C: Quashing of FIR / Charge-Sheet & Discharge</b></summary>

> 📌 *Focus:* Inherent powers under Section 528 BNSS / 482 CrPC and discharge standards under Section 250/262 BNSS.

- [ ] `P0` **State of Haryana v. Bhajan Lal, 1992 Supp (1) SCC 335**
  - *Key Takeaway:* The 7 definitive categories where the High Court must exercise inherent powers to quash criminal proceedings and prevent abuse of process.
- [ ] `P1` **Neeharika Infrastructure Pvt. Ltd. v. State of Maharashtra, 2021 SCC OnLine SC 315**
  - *Key Takeaway:* Parameters governing stay of investigation and interim protection from arrest during quashing petitions.
- [ ] `P1` **Amit Kapoor v. Ramesh Chander, (2012) 9 SCC 460**
  - *Key Takeaway:* Test of prima facie case vs grave suspicion at the stage of framing charges/discharge.
- [ ] `P1` **Sanjay Kumar Rai v. State of Uttar Pradesh, 2021 SCC OnLine SC 367**
  - *Key Takeaway:* Trial courts must not mechanically reject discharge applications; judicial consideration of defense materials is obligatory.
</details>

<br />

<details open>
<summary><b>🔹 Category D: Digital Forensics & Evidentiary Standards</b></summary>

> 📌 *Focus:* Admissibility of electronic records (Sec 63 BSA / Sec 65B IEA), CDRs, CCTV logs, and circumstantial evidence.

- [ ] `P0` **Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal, (2020) 7 SCC 1**
  - *Key Takeaway:* Electronic records (CCTV footage, WhatsApp logs, CDRs) are inadmissible without a certificate under Section 65B(4) IEA (now Section 63 BSA).
- [ ] `P1` **Selvi v. State of Karnataka, (2010) 7 SCC 263**
  - *Key Takeaway:* Involuntary administration of Narco-analysis, polygraph, and brain-mapping violates Article 20(3) (Privilege against self-incrimination).
- [ ] `P1` **Sharad Birdhichand Sarda v. State of Maharashtra, (1984) 4 SCC 116**
  - *Key Takeaway:* The 5 Golden Principles (*Panchsheel*) for circumstantial evidence conviction.
</details>

---

## 📝 Practice Rules & Standard Defense Templates

> 📂 **Collection in Soli:** `Statutes` or `Case Law — Criminal`

- [ ] `P1` **State High Court Criminal Rules of Practice** *(e.g., Delhi High Court Rules / Bombay Criminal Manual)*
- [ ] `P0` **Regular Bail Application Template** (`Section 483 BNSS` / `Section 439 CrPC`)
- [ ] `P0` **Anticipatory Bail Application Template** (`Section 482 BNSS` / `Section 438 CrPC`)
- [ ] `P0` **Application for Statutory Default Bail** (`Section 187 BNSS` / `Section 167(2) CrPC`)
- [ ] `P1` **Application for Discharge** (`Section 250 / 262 BNSS` / `Section 227 / 239 CrPC`)
- [ ] `P1` **Section 94 BNSS / Section 91 CrPC Application** *(Preservation of Telecom CDRs & Tower Locations)*
- [ ] `P1` **Cross-Examination Framework Checklists** *(Medical Officers, Investigating Officers, Panch Witnesses)*

---

## ⚡ Ingestion Execution SOP (How to Ingest in Soli)

```mermaid
graph LR
    A[Download Clean PDF] --> B[Upload to /admin/corpus]
    B --> C[Inspect Chunks / Boundaries]
    C --> D[Run Benchmark in /admin/evals]
    D --> E[Ready for Paralegal Queries]
```

1. **Step 1: Download from Official Portals**
   - Save files with descriptive names: e.g., `BNS_2023_Bare_Act.pdf`, `Satender_Antil_2022_Bail_Guidelines.pdf`.
2. **Step 2: Upload via Admin Control Plane**
   - Go to [http://localhost:3000/admin/corpus](http://localhost:3000/admin/corpus).
   - Select the respective collection tag (`Statutes`, `Constitutional`, or `Case law`).
   - Drag & drop the PDF.
3. **Step 3: Quality Check with Chunk Inspector**
   - Click **"View Chunks"** in the library row.
   - Verify that statutory sections (e.g. `Section 483`) and paragraph numbers are captured without garbled unicode.
4. **Step 4: Benchmark Verification**
   - Open [http://localhost:3000/admin/evals](http://localhost:3000/admin/evals).
   - Run the pre-seeded benchmark test suite to confirm groundedness and citation scores.
