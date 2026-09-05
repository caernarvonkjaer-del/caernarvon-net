# Florida Court Filing Format Rules

This document presents a Florida rule hierarchy suitable for a court-form generator. It covers the principal state trial-court divisions and appellate filings.

The rules are current through September 5, 2026. One known future change is identified where relevant.

## A. Global rules for Florida court documents

Apply these unless a more specific procedural rule, approved form, statute, administrative order, or court order controls.

### 1. Documents created for filing or service

Under Florida Rule of General Practice and Judicial Administration 2.520(a):

| Element | Mandatory rule |
|---|---|
| Page size | Exactly **8.5 Ã— 11 inches** |
| Margins | At least **1 inch on every side** |
| Font size | At least **12 points** |
| Page numbering | Every page consecutively numbered |
| Recording space | If the court document will be recorded in the Official Records, reserve a blank **3 Ã— 3-inch area** at the upper-right of page 1 |
| Verification | Not required unless another statute, rule, or court order specifically requires it |

The rule does not globally require:

- A particular typeface
- Double spacing
- Portrait orientation
- Line numbers
- A particular page-number position
- Numbered paragraphs
- All-capital document titles
- Blue-backed covers
- The attorneyâ€™s name to be printed twice

Source: [Florida Rules of General Practice and Judicial Administration](https://www-media.floridabar.org/uploads/2026/08/2027_01-JULY-Florida-Rules-of-General-Practice-and-Judicial-Administration-7-1-2026.pdf).

### 2. Exhibits and preexisting documents

Do not apply the global layout rules to documents the filer did not create for filing.

- Original-size exhibits may be attached.
- Do not resize or reformat wills, deeds, contracts, photographs, certificates, transcripts, or other preexisting documents merely to create compliant margins.
- Electronic exhibits must satisfy the Florida Courts Technology Standards.
- A preexisting document generally should be appended to a generated notice, motion, petition, or pleading unless a rule permits it to be filed independently.
- Preserve signatures, seals, notarizations, recording marks, borders, and all original content.
- OCR may be added, but the original visual image must not be replaced or altered.

### 3. Paper filings

For any permitted paper filing:

- Print or type legibly.
- Use opaque, white, unglossed paper.
- Print on one side only.
- Multiple pages **should** be secured with removable paper clips.
- Documents **must not** be stapled or bound.

These rules are not limited to self-represented litigants.

### 4. Electronic signature block

Under Rule 2.515, every filed or served document must be signed.

A generated electronic signature block must contain:

- Signerâ€™s printed name
- Electronic-signature indicator
- Mailing address
- Telephone number
- Email address for service when filed or served electronically

For an attorney, also include:

- Florida Bar number
- Party represented

Recommended standard:

```text
/s/ Jordan A. Smith
Jordan A. Smith
Attorney for Plaintiff
Florida Bar No. 123456
Firm Name
Mailing Address
City, Florida ZIP
Telephone: (000) 000-0000
Email: name@example.com
```

Generator rules:

- Standardize typographical signatures as `/s/ Full Name`.
- The filerâ€™s act of electronic filing also constitutes the filerâ€™s signature.
- Each nonfiling signer must be expressly identified as a signer.
- Do not apply a signature without that signerâ€™s authorization.
- If the attorney and represented client both sign, only the attorneyâ€™s contact information is required.
- A paper document requires a signature in a form recognized by law before submission.

### 5. Certificate of service

When service is required, generate a certificate containing:

- Certification that service occurred
- Date of service
- Name of every recipient
- Service address for every recipient
- Method of service

Recommended structure:

```text
CERTIFICATE OF SERVICE

I certify that on [DATE], this document was furnished to:

[NAME]
[SERVICE EMAIL OR MAILING ADDRESS]

by [Florida Courts E-Filing Portal/e-mail/mail/delivery].

/s/ [SIGNER]
[SIGNER]
```

Do not use an uninformative statement such as â€œserved on all parties of recordâ€ without identifying recipients and service addresses.

### 6. Confidential and sensitive information

Before export, screen generated fields under Rules 2.420, 2.423, and 2.425.

Do not include unless legally required:

- Complete Social Security numbers
- Complete financial-account numbers
- Complete debit- or credit-card numbers
- Complete driver-license numbers
- Full birth dates where minimization applies
- Confidential addresses
- Protected victim information
- Confidential juvenile information
- Sealed medical or mental-health information

Where permitted, use the reduced identifiers required by Rule 2.425. The generator should support a separate notice of confidential information or motion to determine confidentiality when required.

### 7. Electronic file construction

Use these export defaults:

- Searchable PDF/A
- Embedded fonts
- Actual text rather than rasterized text
- No password protection
- No restrictive encryption
- No comments or tracked changes
- No hidden layers or hidden text
- No executable content
- Bookmarks for longer documents when practical
- OCR for scanned exhibits
- Accessibility tags when the generator can produce them reliably
- Descriptive document title metadata
- Logical reading order

Source: [Florida Courts Technology Standards Version 4](https://www.flcourts.gov/content/download/2490626/file/florida-courts-technology-standards-v4%20%28adopted%20May%202025%29%20-%20Revised%20June%202026.pdf).

## B. General civil filings

### 1. Civil complaints, petitions, answers, and other pleadings

Florida Civil Rule 1.100(c)(1) requires every pleading caption to contain:

- Name of the court
- File number
- Names of all parties
- Designation identifying the party filing the pleading

The pleading title should identify both the party and document, for example:

```text
DEFENDANT JOHN SMITHâ€™S ANSWER AND AFFIRMATIVE DEFENSES
TO PLAINTIFFâ€™S COMPLAINT
```

A claim for relief must contain:

- Jurisdictional grounds, unless already established
- Short and plain statement of the ultimate facts
- Demand for judgment or other relief

An answer should associate admissions, denials, insufficient-knowledge responses, and affirmative defenses with the corresponding allegations.

### 2. Civil motions, orders, judgments, and other documents

Under Rule 1.100(c)(2), the caption must contain:

- Name of the court
- Case number
- First party on each side
- Appropriate indication that additional parties exist
- Party filing the document
- Nature of the document or order

A motion must:

- Be written unless made during a hearing or trial
- State its grounds with particularity
- State the relief or order sought

A notice of hearing must identify every motion or matter to be heard.

### 3. In rem civil proceedings

Use:

```text
IN RE: [NAME OR GENERAL DESCRIPTION OF PROPERTY]
```

The caption must also state the court, case number, person or entity filing, and nature of the document or order.

### 4. Civil forfeiture proceedings

The mandatory style is:

```text
IN RE: FORFEITURE OF [NAME OR DESCRIPTION OF PROPERTY]
```

### 5. Initial civil complaint or petition

Generate or prompt for Civil Cover Sheet Form 1.997. The complaint caption and cover sheet are separate documents.

### 6. Mortgage-foreclosure complaints

Use a specialized Rule 1.115 template containing the ruleâ€™s required allegations and applicable certification. Attach or identify the note, mortgage, assignments, and supporting instruments as required.

### 7. Documents supporting a civil claim or defense

Under Rule 1.130:

- Attach a copy of any bond, note, bill of exchange, contract, account, or document on which the action or defense is based.
- Alternatively, incorporate the material portion in the pleading.
- Label each attachment clearly.
- Exhibits become part of the pleading for all purposes.

### 8. Subpoenas

Use the applicable Supreme Court form and Rule 1.410 structure. Identify the issuing court, case caption and number, person commanded, time and place, required act, issuer, and mandatory notices.

### 9. Depositions and transcripts filed in civil cases

Full-page transcripts must be filed. Do not submit condensed transcripts containing multiple transcript pages on one document page. Preserve transcript page numbers, line numbers, reporter certification, and exhibit designations.

### 10. Proposed civil orders

Provide a complete caption, descriptive title, defined rulings, unambiguous deadlines, distribution list where required, and judge-signature space. Do not leave substantive blanks unless requested.

## C. Small-claims filings

Florida Small Claims Rules govern unless a civil rule has been expressly incorporated or invoked.

### 1. Small-claims caption

Follow Form 7.310 and identify county court, county, plaintiff and defendant, case number, division if assigned, and party names and addresses.

### 2. Statement of claim

Use the applicable approved form:

- Auto negligence â€” Form 7.330
- Goods sold â€” Form 7.331
- Work and materials â€” Form 7.332
- Money lent â€” Form 7.333
- Promissory note â€” Form 7.334
- Property from pawnbroker â€” Form 7.335
- Replevin against government entity â€” Form 7.336
- Account stated â€” Form 7.337

### 3. Small-claims motions

Use Form 7.351 structure: caption, descriptive title, movant, relief, grounds, certificate of service, and signature/contact block. Specific templates include Motion to Continue, Form 7.352, and Motion to Invoke Civil Rules, Form 7.353.

### 4. Fact Information Sheet

Use Form 7.343 without rearranging or deleting mandatory fields. Protect the sensitive financial information it contains.

Source: [Florida Small Claims Rules](https://www-media.floridabar.org/uploads/2026/08/2026_01-JUL-Small-Claims-Rules-7-1-2026-1.pdf).

## D. Family-law filings

### 1. General family pleadings and motions

Rules 2.520 and 2.525 apply through Family Rule 12.025. Use â€œPetitionerâ€ and â€œRespondent,â€ not automatically â€œPlaintiffâ€ and â€œDefendant.â€

### 2. Approved family-law forms

Where an approved form exists:

- Use that specific form.
- Preserve its title, warnings, certifications, verification clauses, and signature sections.
- Do not omit mandatory fields.
- Do not convert checkboxes into ambiguous prose.
- Permit instructed additional pages.
- Keep form number and revision information.

Source: [Florida Family Law Rules and forms](https://www-media.floridabar.org/uploads/2026/05/2026_04-OCT-Family-Law-Rules-of-Procedure-10-1-2025-1.pdf).

### 3. Initial or reopened family cases

Generate Family Court Cover Sheet Form 12.928.

### 4. Financial affidavits

Select the proper form by income threshold and proceeding type:

- Short-form financial affidavit â€” Form 12.902(b)
- Long-form financial affidavit â€” Form 12.902(c)

Preserve income, expense, asset, liability, conversion, verification, signature, and service sections.

### 5. Child-support filings

Preserve parent-column alignment, income calculations, adjustments, insurance, childcare, percentage shares, and final guideline calculation.

### 6. Parenting plans

Preserve sections for parental responsibility, decision-making, time-sharing, holidays, transportation, communication, and relocation.

### 7. General-magistrate notices and orders

Reproduce required procedural-review warnings substantially as prescribed and retain required bold or conspicuous formatting.

### 8. Adoption and termination-related originals

Consents and acknowledgments may require original submission. Mark them `original_document_may_be_required = true`.

## E. Probate and guardianship filings

### 1. Probate caption

Use the circuit court, county, Probate Division, â€œIn Re: Estate of,â€ decedent, file number, and division.

### 2. Guardianship caption

Use the circuit court, county, Probate Division, â€œIn Re: Guardianship of,â€ ward or alleged incapacitated person, file number, and division.

### 3. Probate petitions

Under Rule 5.020, include a short and plain statement of relief, grounds for relief, and jurisdiction if not already shown. Apply the filing-specific content rule rather than a generic petition schema.

### 4. Probate motions

Include particular grounds and the specific relief or order sought.

### 5. Verified probate documents

When required, include:

```text
Under penalties of perjury, I declare that I have read the
foregoing, and the facts alleged are true, to the best of my
knowledge and belief.
```

### 6. Probate and guardianship accountings

Use the rule-prescribed summary and schedules. Preserve the accounting period, beginning balance, carrying value, estimated current value, classifications, totals, and reconciliation.

### 7. Original wills and codicils

Mark them:

```text
original_submission_required = true
preserve_original_dimensions = true
do_not_modify = true
```

### 8. Documents intended for Official Records

Activate the 3 Ã— 3-inch blank recording space only for the particular court document that will be recorded.

Source: [Florida Probate Rules](https://www-media.floridabar.org/uploads/2026/07/Probate-Rules-07-16-26.pdf).

## F. Criminal filings

### 1. General criminal caption

Use the appropriate circuit or county court, judicial circuit, county, State of Florida, defendant, and case number. Do not use a civil caption.

### 2. Indictments and informations

Preserve the State designation, court and county, defendant, separate count numbering, offense title, statutory citation, essential allegations, date and county of offense, prosecuting attorney signature, and grand-jury foreperson signature where applicable.

### 3. Criminal complaints and probable-cause affidavits

Use prescribed forms and preserve the oath, offense identifiers, narrative, affiant identity, official certification, and arrest/agency identifiers.

### 4. Criminal motions

Use the criminal caption and include movant, grounds, relief, required facts, verification where required, and certificate of service.

### 5. Postconviction motions

Maintain separate templates for Rules 3.800, 3.850, 3.851, and 3.853 because their content, oath, certification, and attachment requirements differ.

### 6. Judgments and sentences

Use uniform forms and preserve count dispositions, offense degree, citations, sentence, time-served credit, financial obligations, biometric sections where required, and judicial signature/rendition information.

### 7. Sworn criminal documents and original judgments

Add document-level original-retention and local-order rules where original submission or retention is required.

Source: [Florida Rules of Criminal Procedure](https://www-media.floridabar.org/uploads/2026/09/2026_01-JUL-Criminal-Procedure-Rules-7-13-2026.pdf).

## G. Juvenile filings

### 1. Juvenile delinquency captions

Rule 8.025 requires:

```text
IN THE INTEREST OF [CHILD], A CHILD
```

or:

```text
IN THE INTEREST OF [CHILDREN], CHILDREN
```

### 2. Dependency and termination captions

Use the child-centered â€œIn the Interest ofâ€ style required by Rule 8.220 rather than a petitioner-versus-respondent caption.

### 3. Families and children in need of services

Use the specific style required by Rule 8.620.

### 4. Juvenile case cover sheet

For a case opened or reopened under Parts II through V, generate Family Law Cover Sheet Form 12.928.

### 5. Delinquency petitions

Apply Rule 8.035, preserving permitted child identification, alleged act, essential allegations, statutory citation, count separation, signature, and verification.

### 6. Dependency and shelter petitions

Use Rule 8.305 or 8.310 and preserve prescribed sections and factual categories.

### 7. Termination-of-parental-rights petitions

Use Rule 8.500-specific fields and verification.

### 8. Judicial-waiver proceedings

Use the approved Rule 8.810 form. Avoid exposing a minorâ€™s identity in visible filenames or metadata.

Source: [Florida Rules of Juvenile Procedure](https://www-media.floridabar.org/uploads/2026/07/2026_7-JAN-Florida-Rules-of-Juvenile-Procedure-01-01-2026.pdf).

## H. Traffic-court filings

### 1. Uniform traffic citations

Use the approved Uniform Traffic Citation form and data structure rather than reconstructing it as a generic pleading.

### 2. Traffic motions

Use the county court caption, State or issuing authority, defendant, citation number, case number if different, specific title, relief, signature, and certificate of service.

### 3. Civil versus criminal traffic

Maintain separate templates for civil traffic infractions, criminal traffic prosecutions, and parking or local-ordinance matters.

## I. Appellate filings

### 1. All appellate documents

Under Appellate Rule 9.045:

| Element | Appellate requirement |
|---|---|
| Text color | Black |
| Body spacing | Double-spaced |
| Computer-generated font | **Arial 14 point** or **Bookman Old Style 14 point** |
| Script/handwriting imitation | Prohibited |
| Footnotes | May be single-spaced; same font size and character spacing as body |
| Quotations | May be single-spaced; same font size and character spacing as body |
| Headings | At least as large as body; may be single-spaced |
| Paper assembly | Removable paper clips recommended; no staples or binding |
| Signature | Rule 2.515 |
| Compliance certificate | Required for computer-generated documents subject to a word limit |

The compliance certificate must certify font and word-limit compliance, be signed, and appear immediately after the certificate of service.

Source: [Florida Appellate Rules](https://www-media.floridabar.org/uploads/2026/06/Appellate-Court-Rules-07-01-26.pdf).

### 2. Appellate briefs

The cover sheet must state the court, style and case number, lower tribunal, represented party, brief type, and filing attorneyâ€™s name, address, and email.

Computer-generated limits:

| Brief type | Maximum |
|---|---:|
| Jurisdiction brief | 2,500 words |
| Initial brief | 13,000 words |
| Answer brief | 13,000 words |
| Reply brief | 4,000 words |
| Answer/cross-initial brief | 22,000 words |
| Reply/cross-answer brief | 13,000 words |
| Cross-reply brief | 4,000 words |
| Specified death-case initial or answer brief | 25,000 words |
| Death-case answer/cross-initial brief | 40,000 words |
| Death-case reply/cross-answer brief | 25,000 words |
| Death-case cross-reply brief | 10,000 words |
| Specified summary/successive capital postconviction initial or answer brief | 20,000 words |
| Corresponding reply brief | 6,500 words |

The word count excludes the caption, cover sheet, tables, certificates of service and compliance, and signature block. The initial brief must include the Rule 9.210 sections, including the 2026 jurisdictional statement.

### 3. Florida Supreme Court jurisdiction briefs

- Limit argument to Supreme Court jurisdiction.
- Include the required jurisdictional sections.
- The appendix may contain only the conformed district-court decision.
- No reply brief is permitted.

### 4. Original writ petitions

Current through September 30, 2026:

- Computer-generated petition: maximum 13,000 words.
- Handwritten or typewritten petition: maximum 50 pages.
- Caption names the court and all parties on each side.
- Include a supporting appendix when seeking an order directed to a lower tribunal.
- Cite relevant appendix pages.

The August 27, 2026 amendment becomes effective October 1, 2026 and reorganizes caption, party, and service rules. Version this rule by effective date. Source: [Supreme Court amendment SC2025-2000](https://law.justia.com/cases/florida/supreme-court/2026/sc2025-2000.html).

### 5. Circuit-court appellate proceedings

When a circuit court exercises appellate jurisdiction, apply the Florida Rules of Appellate Procedureâ€”including the 14-point font and spacing requirementsâ€”rather than ordinary civil-document defaults.

## J. Local-rule and judge-specific layer

After applying statewide global and division-specific rules, apply:

1. Circuit administrative orders
2. County-specific administrative orders
3. Division procedures
4. Assigned judgeâ€™s practice requirements
5. Case-specific court orders

For Pinellas electronic filings, Administrative Order 2023-038 addresses Portal filing, signature formats, filer information, self-represented electronic filing, PDF/A, labeled attachments, original documents, and proposed orders.

Source: [Pinellas AO 2023-038](https://www.jud6.org/LegalCommunity/LegalPractice/AOSAndRules/aos/aos2023/2023-038.pdf).

## Recommended generator precedence

```text
case-specific court order
    â†“
current approved mandatory form
    â†“
filing-type procedural rule
    â†“
division-specific procedural rules
    â†“
current local administrative order
    â†“
Rules 2.515, 2.516, 2.520, 2.525 and Technology Standards
    â†“
generator style defaults
```

A lower-level rule should never overwrite a more specific requirement. Store the authority and effective date with each rule and maintain version control.