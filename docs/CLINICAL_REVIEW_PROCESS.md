# Clinical Review Process

## Purpose
This document outlines the clinical governance framework for all clinical knowledge base content, ensuring accuracy, safety, and applicability before deployment to field users in reproductive health settings.

## Reviewer Qualifications

### Minimum Requirements
- **Primary Reviewers:** Licensed medical professional (MD/DO) OR registered nurse (RN) OR certified midwife (CM) with:
  - Minimum 3 years direct clinical experience in reproductive health or obstetrics/gynecology
  - Current, valid license to practice in jurisdiction
  - No undisclosed conflicts of interest with drug manufacturers or service providers

- **Clinical Director (Sign-off):** MD/DO with:
  - Minimum 5 years clinical experience in reproductive health
  - Leadership experience (departmental, health system, or NGO level)
  - Responsibility for clinical safety and risk management

- **Operations Manager (Final Approval):** Healthcare administrator or program director with:
  - Experience implementing clinical protocols in low-resource settings
  - Understanding of field deployment constraints and limitations
  - Authority to approve content distribution

### Conflict of Interest Declaration
All reviewers must sign conflict of interest declaration before review assignment. Disqualifying conflicts:
- Financial interest in pharmaceutical company
- Undisclosed financial relationship with drug/device manufacturer
- Active litigation related to clinical negligence
- Recent disciplinary action from professional body

## Document Review Checklist

For each JSONL clinical document, reviewer must verify:

### Accuracy & Evidence
- [ ] All medication dosages match WHO/national guidelines or peer-reviewed literature
- [ ] Contraindications accurately reflect current evidence
- [ ] Warnings are clinically significant and evidence-based
- [ ] No outdated protocols or superseded recommendations
- [ ] Drug names, routes, and formulations are accurate and available in target countries
- [ ] All claims include proper source attribution

### Completeness & Clarity
- [ ] Clinical protocols cover complete patient journey (assessment → treatment → follow-up)
- [ ] Instructions are step-by-step and actionable in field settings
- [ ] Edge cases and special populations are addressed (pregnancy, breastfeeding, pediatric)
- [ ] Danger signs and complications are clearly identified
- [ ] When to escalate/refer is explicitly stated
- [ ] No ambiguous language; all clinical terms defined

### Applicability to Target Population
- [ ] Content applies to target geographic region(s) and resource settings
- [ ] Recommendations account for limited infrastructure and supplies
- [ ] Medications/procedures are available or accessible in target settings
- [ ] Cultural considerations are acknowledged (e.g., family consent practices)
- [ ] Language is appropriate for field healthcare workers (not overly academic)

### Safety for Offline Use
- [ ] Content can be safely applied without real-time internet access
- [ ] Offline references (e.g., drug doses) are complete and self-contained
- [ ] No reliance on external links or dynamic data
- [ ] Critical disclaimers and limitations are embedded in content

### Liability & Risk Management
- [ ] Clear disclaimer that content is for decision support, not definitive guidance
- [ ] Emphasis on necessity of clinical judgment and patient-specific assessment
- [ ] Recognition of field clinician's scope of practice limitations
- [ ] Acknowledgment that content cannot cover all clinical scenarios

## Drug Formulary Review Checklist

For each formulary entry, reviewer must verify:

### Drug Information Accuracy
- [ ] Generic name matches WHO Essential Medicines List or national formulary
- [ ] Brand names/local names are accurate and region-specific
- [ ] Dosage, route, timing, and formulation are correct
- [ ] Alternative dosing (e.g., for renal impairment) is accurate
- [ ] Duration of therapy is specified

### Contraindications & Warnings
- [ ] Absolute contraindications are identified (FDA Category X, etc.)
- [ ] Relative contraindications (use with caution) are distinguished from absolute
- [ ] Pregnancy risk category is accurate (FDA A/B/C/D/X)
- [ ] Breastfeeding compatibility is verified (Lactation Risk Category)
- [ ] Drug interactions with obstetric medications are identified
- [ ] Warning signs and adverse effects are clinically relevant

### Source Attribution
- [ ] Source document is cited (WHO, national guideline, peer-reviewed literature)
- [ ] Source URL/publication is verifiable
- [ ] Publication year is recent (within 5 years preferred, ≤10 years acceptable)
- [ ] WHO Essential Medicines List (EML) status is accurately marked

### Safe Offline Use
- [ ] All dosing information is self-contained (no external references required)
- [ ] Critical contraindications are highlighted
- [ ] Pregnancy/breastfeeding considerations are clear

## Approval Workflow

```
Content Submission
        ↓
Primary Clinical Review (MD/RN/CM)
    - Complete document checklist
    - Mark as PENDING_REVIEW, needs corrections, or CLINICIAN_APPROVED
        ↓
Clinical Director Review (MD with leadership)
    - Spot-check critical sections
    - Verify field applicability
    - Approve or request additional review
        ↓
Operations Manager Final Approval
    - Verify format and metadata compliance
    - Confirm no missing review signatures
    - Publish to knowledge base
        ↓
Content Published with Review Status: CLINICIAN_APPROVED
```

## Sign-Off Fields in Metadata

Each clinical document metadata file (`.meta.json`) must include:

```json
{
  "clinicalReviewStatus": "PENDING_REVIEW" | "CLINICIAN_APPROVED" | "NEEDS_REVISION",
  "clinicalReviewers": [
    {
      "name": "Dr. Jane Doe",
      "credentials": "MD, ObGyn, 10 years reproductive health",
      "role": "primary_reviewer",
      "signedAt": "2026-04-12T10:30:00Z",
      "comments": "Reviewed dosages, found one error in magnesium sulfate"
    }
  ],
  "clinicalDirector": {
    "name": "Dr. John Smith",
    "credentials": "MD, ObGyn, program director",
    "signedAt": "2026-04-12T14:00:00Z",
    "comments": "Approved. Field-appropriate recommendations."
  },
  "opsManager": {
    "name": "Sarah Johnson",
    "credentials": "RN, healthcare administrator",
    "signedAt": "2026-04-12T15:30:00Z",
    "comments": "Published to production"
  },
  "reviewChecklist": {
    "accuracyVerified": true,
    "currentAsOfYear": true,
    "applicableToTarget": true,
    "completeAndClear": true,
    "safeForOfflineUse": true
  },
  "expiryDate": "2027-04-12",
  "nextReviewDue": "2027-04-01"
}
```

## Content Expiry & Update Schedule

### Expiry Policy
- All clinical documents expire 12 months after final review sign-off
- Content marked PENDING_REVIEW expires 6 months after creation
- Expired content is marked as archived and removed from offline bundles

### Update Frequency
- **Critical updates** (safety issues, FDA warnings): Within 48 hours
- **Significant updates** (new evidence, guideline changes): Within 30 days
- **Minor corrections** (typos, clarifications): Within 90 days
- **Routine review**: Every 12 months

## Audit Trail

All clinical document changes must be logged:
- Who reviewed it (reviewer name, credentials)
- What changes were made (version control)
- When it was reviewed (timestamp)
- Why changes were made (reason/rationale)
- Who approved it (clinical director signature)

```typescript
// Example audit log entry
{
  documentSlug: "who-safe-abortion-care",
  reviewer: "Dr. Jane Doe",
  reviewType: "initial_review",
  status: "clinician_approved",
  timestamp: "2026-04-12T10:30:00Z",
  changesRequested: ["Update magnesium sulfate dose to 1g IV"],
  finalComments: "Safe and field-appropriate",
  clinicalDirectorApproval: "2026-04-12T14:00:00Z"
}
```

## Disclaimer & Liability

All published content must include prominent disclaimer:

> **CLINICAL DISCLAIMER**: This knowledge base provides evidence-based clinical decision support for reproductive health professionals. It is NOT a substitute for professional clinical judgment, direct patient assessment, or adherence to local protocols and regulations. Content is based on WHO guidelines and peer-reviewed literature current as of publication date. Users must apply clinical judgment considering patient-specific factors, local infrastructure, and legal/regulatory requirements. The system creators assume no liability for outcomes resulting from use or misuse of this content.

This disclaimer must be:
- Displayed prominently on first use of clinical features
- Accessible from all clinical query results
- Included in offline bundle README
- Acknowledged by users before clinical queries are logged

## Non-Compliance & Escalation

### Process Failures
If a document is found to lack proper review signatures or checklist completion:
1. Immediately remove from production bundles
2. Flag for expedited clinical director review
3. Do not redistribute until properly reviewed and signed
4. Log incident in audit trail

### Content Safety Issues
If a user reports an error or safety concern:
1. Immediately create urgent review ticket (target: 24-hour response)
2. Clinical director evaluates claim
3. If valid, document is immediately archived
4. Update workflow to prevent similar issues

### Reviewer Performance
If a reviewer's content is found to have systematic errors:
1. Clinical director discusses findings with reviewer
2. Additional training or supervision provided
3. Reviewer's credentials/qualifications verified
4. Future reviews may require clinical director co-signature

## Training & Competency

All reviewers must complete:
- [ ] One-time: UNFPA clinical governance training (2 hours)
- [ ] Annual: Evidence-based clinical decision-making refresher
- [ ] Quarterly: Case discussions on clinical errors and near-misses
- [ ] Per review: Domain-specific training for new review areas

## Contact & Questions

**Clinical Review Coordinator:** [clinical-review@unfpa-otg.org]
- Assigns reviews and manages workflow
- Monitors timeline and escalates delays
- Maintains reviewer database and credentials

**Clinical Director:** [clinical-director@unfpa-otg.org]
- Final arbiter of clinical content safety
- Approves reviewer selections
- Handles escalations and disputes

**Disclaimer & Legal Review:** [legal@unfpa-otg.org]
- Ensures liability disclaimers are current
- Reviews regulatory/compliance implications
- Manages consent forms and waivers
