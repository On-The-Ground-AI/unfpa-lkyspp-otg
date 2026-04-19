# Clinical Knowledge Base — Source URL Audit

**Last audited:** 2026-04-19  
**Auditor:** Schema normalization pass (automated + manual review)

## Schema Drift Fixes Applied (2026-04-19)

| File | Changes Made |
|---|---|
| `WHO-MEC-Contraceptive-Eligibility.meta.json` | `clinicalReviewStatus` → `clinicalStatus`; `edition` → `sourceEdition`; added `vertical`, `contentType`, `sections`; removed `reviewChecklist` |
| `WHO-Safe-Abortion-Care.meta.json` | Same normalization as above |
| `STI-Syndromic-Management.meta.json` | Same normalization as above |
| `Emergency-Obstetric-Care.meta.json` | Same normalization as above |
| `Neonatal-Resuscitation-Program.meta.json` | Same normalization as above |
| `UNFPA-Protocols-Clinical-Standards.meta.json` | `parts` → `sections` |
| `WHO-PCPNC-Maternal-Management.meta.json` | `chapters` → `sections` |

---

## Source URL Status

| Slug | Publisher | Source URL | Expected Status | Notes |
|---|---|---|---|---|
| `who-mec-contraceptive-eligibility` | WHO | https://www.who.int/publications/i/item/9789241549158 | ✅ Live | WHO MEC 5th ed. (2015). ISBN 978-92-4-154915-8. WHO publications page is stable. |
| `who-safe-abortion-care` | WHO | https://www.who.int/publications/i/item/9789240016941 | ✅ Live | WHO Safe Abortion Guidelines (2022). ISBN 978-92-4-001694-1. |
| `sti-syndromic-management` | WHO | https://www.who.int/publications/i/item/9789240039094 | ✅ Live | WHO STI Syndromic Management Guidelines (2022). ISBN 978-92-4-003909-4. |
| `emergency-obstetric-care` | WHO | https://www.who.int/publications/guidelines/maternal-newborn-health | ⚠️ Verify | URL is a landing page, not a direct publication permalink. May redirect. Recommend updating to a stable ISBN-based permalink when available. |
| `neonatal-resuscitation-program` | AAP/AHA | https://www.aap.org/en/professional-resources/neonatal-resuscitation/ | ✅ Live | AAP NRP landing page. May require login to access full content. Confirm `redistributionOk: true` with AAP licensing terms. |
| `who-essential-medicines-reproductive` | WHO | https://www.who.int/teams/health-products-and-policies/essential-medicines-and-health-products/publications/essential-medicines-lists/ | ✅ Live | WHO EML landing page. Stable. 23rd edition (2023). |
| `unfpa-protocols-clinical-standards` | UNFPA | https://www.unfpa.org/resources | ⚠️ Verify | Generic UNFPA resources page — not a direct URL for this document. A specific permalink should be identified and added. Flag for human curator. |
| `who-pcpnc-maternal-management` | WHO | https://www.who.int/publications/i/item/9789240091672 | ✅ Live | WHO PCPNC 3rd edition (2023). ISBN 978-92-4-009167-2. |

---

## Action Items

1. **`emergency-obstetric-care`** — Replace `sourceUrl` with a stable WHO publication permalink (search by title or ISBN at who.int/publications).
2. **`unfpa-protocols-clinical-standards`** — Identify the specific UNFPA publication this content was sourced from and update `sourceUrl` to the direct page.
3. **`neonatal-resuscitation-program`** — Confirm redistribution licence with AAP. NRP 8th edition materials may have educational-use restrictions. Update `redistributionNotes` accordingly.
4. **All `clinicalStatus: "PENDING_REVIEW"` files** — Assign to a clinical reviewer. When reviewed, update `clinicalStatus` to `"VERIFIED"`, `clinicalReviewer` to reviewer name/ID, and `reviewedAt` to ISO date.

---

## Verification Checklist (per source)

For each source, a clinical reviewer should confirm:
- [ ] Content accurately reflects the cited source document
- [ ] Edition and publication year are current (not superseded by newer version)
- [ ] Content is applicable to the target settings (low-resource, humanitarian, or primary care)
- [ ] No medication dosing information in CHW-vertical content
- [ ] Redistribution terms permit the use described in `redistributionNotes`
