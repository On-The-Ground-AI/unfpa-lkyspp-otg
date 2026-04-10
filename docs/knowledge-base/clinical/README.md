# Clinical Knowledge Base

This directory contains clinical guidelines and essential medicines references for **midwives, nurses, and skilled birth attendants** in low and middle-income settings.

## Vertical Code: `CLINICAL`

## Current Sample Documents

| Document | Source | Status |
|---|---|---|
| WHO PCPNC 2023 (Maternal Management) | WHO PCPNC 3rd ed, 2023 | ✅ Included |
| WHO Essential Medicines (Reproductive) | WHO EML 23rd ed, 2023 | ✅ Included |
| UNFPA Clinical Protocols & Standards | UNFPA 2023 | ✅ Included |

## Priority P0 Sources to Acquire (Not Yet in Repository)

| Document | Source | Status |
|---|---|---|
| WHO MEC 5th/6th Ed (contraceptive eligibility) | who.int | ⏳ Planned |
| WHO Safe Abortion Care 2022 | who.int | ⏳ Planned |
| WHO ANC Recommendations 2016 | who.int | ⏳ Planned |
| WHO IMPAC/MCPC (Managing Complications) | who.int | ⏳ Planned |
| WHO GBV Clinical Handbook 2019 | who.int | ⏳ Planned |
| MSF Essential Obstetric & Newborn Care | medicalguidelines.msf.org | ⏳ Planned |
| Sphere Handbook 2018 | spherestandards.org | ⏳ Planned |
| UNFPA Midwifery Handbook | unfpa.org | ⏳ Planned |

## Document Format and Structure

All clinical documents in this directory must be structured as **JSONL files** with typed blocks that can be processed by the `clinicalChunkingService`. See [CLINICAL_KNOWLEDGE_BASE.md](./CLINICAL_KNOWLEDGE_BASE.md) for detailed structure documentation.

### Quick Start: Understanding Block Types

```jsonl
{"type":"heading","level":2,"text":"Section Title","page":1}
{"type":"paragraph","text":"Paragraph content...","page":1}
{"type":"table","caption":"Table Title","header":["Col 1","Col 2"],"rows":[["Cell 1","Cell 2"]],"page":2}
{"type":"list","ordered":true,"items":["Item 1","Item 2"],"page":2}
```

## Validation & Testing

Use the validation script to check document structure before ingestion:

```bash
# Validate a single document
npx ts-node scripts/validate-clinical-sources.ts --file docs/knowledge-base/clinical/WHO-PCPNC-Maternal-Management.jsonl

# Validate all documents
npx ts-node scripts/validate-clinical-sources.ts --all

# Verbose output with heading hierarchy
npx ts-node scripts/validate-clinical-sources.ts --all --verbose
```

The validator checks:
- ✓ Valid JSONL structure (each line is valid JSON)
- ✓ Required and optional fields by block type
- ✓ Heading hierarchy consistency
- ✓ Page number sequencing
- ✓ Word counts and document statistics
- ✓ Metadata file completeness

## Sidecar `.meta.json` Format

Each JSONL document should have a corresponding `.meta.json` file with source metadata:

```json
{
  "sourceDocument": "WHO PCPNC 2023",
  "sourceTitle": "Pregnancy, Childbirth, Postpartum and Newborn Care: A guide for essential practice",
  "sourceEdition": "3rd edition, 2023",
  "sourceUrl": "https://www.who.int/publications/i/item/9789240091672",
  "publisher": "World Health Organization",
  "publicationYear": 2023,
  "redistributionOk": true,
  "redistributionNotes": "WHO permits redistribution of guidelines for non-commercial health purposes",
  "vertical": "CLINICAL",
  "clinicalReviewer": null,
  "reviewedAt": null,
  "clinicalStatus": "UNVERIFIED",
  "expiryDate": "2028-12-31",
  "contentType": "Clinical guidelines for maternal care"
}
```

## Clinical Review Requirement

**Every document in this directory requires clinical sign-off before use in the app.**

A qualified obstetrician, senior midwife, or GBV specialist must review the ingested chunks and set the `clinicalReviewer` and `reviewedAt` fields in the metadata.

Until `clinicalStatus = 'VERIFIED'`, chunks will be served with an amber disclaimer banner in the app.

### Approval Workflow

1. Document added to this directory with `clinicalStatus: "UNVERIFIED"`
2. Ingestion pipeline processes document and creates chunks
3. Clinical reviewer examines sample chunks (especially tables, protocols, drug doses)
4. Reviewer updates metadata: `clinicalReviewer: "Dr. Jane Smith"`, `reviewedAt: "2024-04-10"`, `clinicalStatus: "VERIFIED"`
5. App serves content with confidence level indicator

## ⚠️ CODEOWNERS

Changes to this directory require approval from `@unfpa-otg/clinical-reviewers`.
See `.github/CODEOWNERS` for details.
