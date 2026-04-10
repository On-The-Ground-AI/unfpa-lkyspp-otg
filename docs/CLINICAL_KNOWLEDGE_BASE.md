# Clinical Knowledge Base: Architecture and Workflow

This document describes the architecture, ingestion workflow, and data structure for the UNFPA OTG clinical knowledge base system.

## Overview

The clinical knowledge base serves evidence-based clinical guidelines and essential medicines references to healthcare workers in low and middle-income countries. The system emphasizes:

- **Medical accuracy**: All content sources are WHO, UNFPA, or MOH guidelines
- **Citation integrity**: Every chunk includes source attribution and page numbers
- **Chunk atomicity**: Tables and protocol lists are never split mid-content
- **Multilingual support**: Documents can include content in multiple languages

## Architecture

### Components

```
docs/knowledge-base/clinical/          # Clinical source documents
├── WHO-PCPNC-Maternal-Management.jsonl       # JSONL blocks
├── WHO-PCPNC-Maternal-Management.meta.json   # Metadata
├── WHO-Essential-Medicines-Reproductive.jsonl
├── WHO-Essential-Medicines-Reproductive.meta.json
└── UNFPA-Protocols-Clinical-Standards.jsonl
    UNFPA-Protocols-Clinical-Standards.meta.json

next-app/services/
├── clinicalChunkingService.ts          # Table-safe chunker
└── embeddingService.ts                 # Multilingual embeddings

next-app/scripts/
├── ingest-clinical.ts                  # Main ingestion pipeline
└── validate-clinical-sources.ts        # Pre-ingestion validation

scripts/
└── extract_clinical_pdf.py             # Python PDF extraction (future)
```

### Data Flow

```
PDF Document
    ↓
[extract_clinical_pdf.py] → JSONL Blocks
    ↓
[validate-clinical-sources.ts] → Validation Report
    ↓
[clinicalChunkingService] → Chunks with Metadata
    ↓
[embeddingService] → Vector Embeddings
    ↓
PostgreSQL
├── knowledge_chunks (content + embeddings)
├── clinical_sources (document registry)
└── chunk_citations (page attribution)
```

## Document Structure

### JSONL Block Format

Clinical documents are stored as **JSON Lines** (JSONL), where each line is a complete JSON object representing a content block. This format is designed for integrity-preserving chunking by the `clinicalChunkingService`.

#### Block Types and Fields

```typescript
interface ClinicalBlock {
  type: 'heading' | 'paragraph' | 'table' | 'list';
  level?: number;          // For headings: 1-6 (1 = H1, 2 = H2, etc.)
  text?: string;           // For headings and paragraphs
  caption?: string;        // For tables: descriptive caption
  header?: string[];       // For tables: column headers
  rows?: string[][];       // For tables: data rows (array of arrays)
  ordered?: boolean;       // For lists: true = numbered, false = bulleted
  items?: string[];        // For lists: list item strings
  page: number;            // Page number in source (required for all types)
}
```

### Example Document Structure

```jsonl
{"type":"heading","level":1,"text":"WHO PCPNC 2023","page":1}
{"type":"paragraph","text":"This guide provides evidence-based recommendations...","page":1}
{"type":"heading","level":2,"text":"Active Management of Third Stage of Labour","page":5}
{"type":"list","ordered":true,"items":["Administer oxytocin","Controlled cord traction","Uterine massage"],"page":5}
{"type":"table","caption":"Oxytocin Dosing Schedule","header":["Scenario","Dose","Route"],"rows":[["AMTSL","10 IU","IM"],["PPH","20-40 IU","IV infusion"]],"page":6}
```

### Metadata File Format

Each JSONL document must have a corresponding `.meta.json` file:

```json
{
  "sourceDocument": "WHO PCPNC 2023",
  "sourceTitle": "Full title of the document",
  "sourceEdition": "3rd edition, 2023",
  "sourceUrl": "https://...",
  "publisher": "World Health Organization",
  "publicationYear": 2023,
  "redistributionOk": true,
  "redistributionNotes": "WHO permits redistribution for non-commercial health purposes",
  "vertical": "CLINICAL",
  "clinicalReviewer": null,
  "reviewedAt": null,
  "clinicalStatus": "UNVERIFIED",
  "expiryDate": "2028-12-31",
  "contentType": "Clinical guidelines for maternal health",
  "chapters": ["Chapter 3: ...", "Chapter 4: ..."]
}
```

#### Metadata Fields Explained

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceDocument` | string | Yes | Short identifier (e.g., "WHO PCPNC 2023") |
| `sourceTitle` | string | Yes | Full title of the source document |
| `sourceEdition` | string | No | Edition and year (e.g., "3rd edition, 2023") |
| `sourceUrl` | string | No | URL where official document can be accessed |
| `publisher` | string | No | Publishing organization |
| `publicationYear` | number | No | Year published |
| `redistributionOk` | boolean | Yes | Whether redistribution is permitted |
| `redistributionNotes` | string | No | Specific restrictions on redistribution |
| `vertical` | string | No | Content vertical code (e.g., "CLINICAL", "MISP", "CHW") |
| `clinicalReviewer` | string or null | No | Name of reviewer who verified content |
| `reviewedAt` | string or null | No | ISO 8601 date of review (e.g., "2024-04-10") |
| `clinicalStatus` | string | No | Status: "UNVERIFIED", "UNDER_REVIEW", "VERIFIED" |
| `expiryDate` | string | No | ISO 8601 date when content should be re-reviewed |
| `contentType` | string | No | Brief description of content scope |
| `chapters` | string[] | No | List of major sections included |

## Ingestion Workflow

### Step 1: Validate Document Structure

Before ingesting, validate the JSONL structure:

```bash
npx ts-node scripts/validate-clinical-sources.ts --file docs/knowledge-base/clinical/YOUR-DOCUMENT.jsonl
```

The validator checks:
- ✓ Valid JSON on every line
- ✓ Required fields present for each block type
- ✓ Heading hierarchy consistency (no level jumps)
- ✓ Page numbers are sequential
- ✓ Word counts and statistics
- ✓ Metadata file exists and is valid

### Step 2: Ingest Document

The ingestion pipeline processes the document and creates embeddings:

```bash
# Ingest a single document
npx ts-node next-app/scripts/ingest-clinical.ts --file docs/knowledge-base/clinical/YOUR-DOCUMENT.jsonl --vertical CLINICAL

# Ingest all clinical documents
npx ts-node next-app/scripts/ingest-clinical.ts --all --vertical CLINICAL

# Dry run (preview without database writes)
npx ts-node next-app/scripts/ingest-clinical.ts --all --dry-run
```

The ingestion pipeline:
1. Reads the JSONL file and parses blocks
2. Chunks content using `clinicalChunkingService` (table-safe)
3. Generates embeddings using multilingual MiniLM
4. Stores chunks in PostgreSQL with metadata
5. Registers document in `ClinicalSource` table

### Step 3: Validate Chunks in Database

After ingestion, verify chunks are correctly formatted:

```sql
SELECT 
  cs.source_document,
  COUNT(*) as chunk_count,
  AVG(k.word_count) as avg_words,
  MIN(k.word_count) as min_words,
  MAX(k.word_count) as max_words
FROM clinical_sources cs
JOIN knowledge_chunks k ON k.source_id = cs.id
WHERE cs.source_document = 'WHO PCPNC 2023'
GROUP BY cs.source_document;
```

### Step 4: Clinical Review and Verification

A qualified clinician reviews the ingested chunks:

1. **Sample review**: Check 10-15 chunks across different sections
2. **Focus areas**: 
   - Drug dosages are accurate
   - Tables were not split mid-row
   - Clinical protocols are complete
   - Citation page numbers are correct
3. **Update metadata**:
   ```json
   {
     "clinicalReviewer": "Dr. Jane Smith, MD, OB/GYN",
     "reviewedAt": "2024-04-10",
     "clinicalStatus": "VERIFIED"
   }
   ```

Until verification, chunks are served with a disclaimer: "⚠️ This content has not been clinically reviewed. Use with caution."

## Clinical Chunking Strategy

### Why Table-Safe Chunking?

Standard document chunkers break content at word limits, which can split tables mid-row or split numbered lists. This is dangerous for clinical content where:

- **Dosing tables** must stay atomic (don't split "10 IU IM | Within 1 minute" across chunks)
- **Clinical protocols** numbered 1-5 must remain together
- **Treatment algorithms** with multiple branches must stay in one chunk

### How clinicalChunkingService Works

```typescript
// Input: JSONL blocks with type and page info
// Output: Chunks that preserve document structure

1. Parse JSONL into typed blocks (heading, paragraph, table, list)
2. Build heading breadcrumb context ("Chapter 3 > Section 3.2")
3. Accumulate blocks into chunks:
   - TARGET: 800 words per chunk
   - MAX: 1500 words (higher than standard to keep tables intact)
   - MIN: 50 words
4. Flush chunk when:
   - Block is a table/list AND (would exceed MAX_WORDS OR too large for current chunk)
   - Heading encountered AND accumulated words >= TARGET_WORDS
   - Next block would exceed MAX_WORDS
5. Add overlap: last 80 words of previous chunk start next chunk
6. Each chunk includes:
   - Heading breadcrumb for context
   - Source document and page attribution
   - Word count and token estimate
```

### Example: How a Table is Handled

```jsonl
{"type":"paragraph","text":"Oxytocin is the gold standard uterotonic...","page":6}
{"type":"table","caption":"Dosing Schedule","header":["Scenario","Dose","Route"],"rows":[["AMTSL","10 IU","IM"],...],"page":7}
{"type":"paragraph","text":"Timing is critical...","page":7}
```

Result:
- Paragraph about oxytocin → chunk 1 (if >50 words)
- Table → chunk 2 (atomic, never split)
- Paragraph about timing → chunk 3 (with 80-word overlap from chunk 2)

**Never**: The table is not split across chunks, even if it would exceed 800 words.

## Adding New Documents

### For PDF Sources (Future)

The `extract_clinical_pdf.py` Python script will extract and structure PDFs:

```bash
python3 scripts/extract_clinical_pdf.py /path/to/source.pdf /path/to/output.jsonl --source-name "WHO PCPNC 2023"
```

This will:
1. Parse PDF using PyMuPDF (fitz)
2. Extract text, tables (using Camelot), and heading hierarchy
3. Output JSONL blocks with page numbers
4. Generate high-confidence heading context

### For Manual Documents

If creating a document manually:

1. Read the source PDF or document
2. Create a JSONL file with blocks:
   ```jsonl
   {"type":"heading","level":1,"text":"Title","page":1}
   {"type":"paragraph","text":"Content...","page":1}
   {"type":"table","caption":"...","header":[...],"rows":[...],"page":2}
   ```
3. Create corresponding `.meta.json` with metadata
4. Run validator: `npx ts-node scripts/validate-clinical-sources.ts --file ...`
5. Ingest: `npx ts-node next-app/scripts/ingest-clinical.ts --file ...`
6. Clinical review and verification

### Checklist for New Documents

- [ ] Document is from WHO, UNFPA, MSF, or MOH
- [ ] Source URL and publication year documented in metadata
- [ ] Redistribution is permitted (check WHO/UNFPA terms)
- [ ] JSONL structure is valid (heading hierarchy, page numbers)
- [ ] Metadata file exists with required fields
- [ ] Validator passes: `--all` with no errors
- [ ] Tables are atomic (not split mid-row)
- [ ] Lists are complete (no items split across blocks)
- [ ] Drug dosages are accurate and complete
- [ ] Clinical protocols are clear and step-by-step
- [ ] Clinical review performed and status updated to VERIFIED

## Multilingual Support

Documents can contain content in multiple languages:

```jsonl
{"type":"heading","level":2,"text":"Active Management of Third Stage of Labour","page":5}
{"type":"heading","level":3,"text":"Active Management ng Ikatlong Yugto ng Manggagamit - Filipino","page":5}
{"type":"paragraph","text":"Ang oxytocin ay ang gold standard na uterotonic...","page":5}
```

The `embeddingService` uses multilingual MiniLM, which handles 50+ languages. Chunks are tagged with language and can be filtered in search.

## Citation Metadata

Every chunk includes:

```json
{
  "content": "# WHO PCPNC 2023\n## Chapter 3 > Section 3.2\n\n...",
  "sourcePage": 7,
  "sourceDocument": "WHO PCPNC 2023",
  "sourceSection": "Active Management of Third Stage of Labour",
  "sectionHeading": "Chapter 3 > Section 3.2"
}
```

This allows app to display:
- Source attribution: "Source: WHO PCPNC 2023, page 7"
- Section context: "In the context of Active Management of Third Stage of Labour"
- Verification status: "✓ Clinically reviewed by Dr. Jane Smith"

## Quality Assurance

### Validation Checklist

Before marking a document as VERIFIED:

1. **Content accuracy**
   - [ ] Drug names and generic names match WHO EML
   - [ ] Dosages match WHO/UNFPA/MOH guidance
   - [ ] Diagnostic criteria match international standards
   - [ ] No outdated information

2. **Structure integrity**
   - [ ] All tables present both header and data rows
   - [ ] All lists are complete (no items missing)
   - [ ] Heading hierarchy is logical
   - [ ] Page numbers are sequential

3. **Citation metadata**
   - [ ] Source document and edition are correct
   - [ ] Page numbers match original source
   - [ ] Redistribution status is accurate
   - [ ] Publication year is current (within 5 years)

4. **Operational feasibility**
   - [ ] Content is appropriate for offline mobile use
   - [ ] Clinical decision trees are step-by-step
   - [ ] Drug protocols include both first-line and alternatives
   - [ ] Dosages are practical for resource-limited settings

### Audit Trail

The `ClinicalSource` table tracks:
- Document ingestion date
- Clinical reviewer and review date
- Clinical status (UNVERIFIED → VERIFIED)
- Content expiry date
- Last update timestamp

This creates an audit trail for compliance and quality assurance.

## Database Schema

### clinical_sources Table

```sql
CREATE TABLE clinical_sources (
  id BIGSERIAL PRIMARY KEY,
  source_document VARCHAR(255) NOT NULL,           -- "WHO PCPNC 2023"
  source_title VARCHAR(500),
  source_url TEXT,
  publisher VARCHAR(255),
  publication_year INTEGER,
  vertical VARCHAR(50),                            -- "CLINICAL", "MISP", "CHW"
  sha256_hash VARCHAR(64) NOT NULL UNIQUE,         -- For integrity checking
  ingested_at TIMESTAMP DEFAULT NOW(),
  chunk_count INTEGER,
  total_words INTEGER,
  clinical_reviewer VARCHAR(255),
  reviewed_at TIMESTAMP,
  clinical_status VARCHAR(50) DEFAULT 'UNVERIFIED', -- UNVERIFIED, VERIFIED, DEPRECATED
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### knowledge_chunks Table (Extended)

```sql
ALTER TABLE knowledge_chunks ADD COLUMN (
  source_id BIGINT REFERENCES clinical_sources(id),
  source_document VARCHAR(255),      -- Denormalized for query efficiency
  source_page INTEGER,               -- Page in source PDF
  source_section VARCHAR(500),       -- "Section 3.2 — AMTSL"
  section_heading VARCHAR(500)       -- Breadcrumb: "Chapter 3 > Section 3.2"
);

CREATE INDEX idx_chunks_source_document ON knowledge_chunks(source_document);
CREATE INDEX idx_chunks_source_page ON knowledge_chunks(source_page);
```

## Troubleshooting

### Issue: Validation fails with "Invalid heading hierarchy"

**Cause**: Heading levels jump (e.g., H2 → H4)
**Fix**: Ensure heading hierarchy is sequential (H1 → H2 → H3, not H1 → H3)

### Issue: Table appears split across multiple chunks

**Cause**: Table exceeds MAX_WORDS (1500) and is treated as oversized
**Fix**: Simplify table or split into two tables with captions ("Part 1" and "Part 2")

### Issue: Clinical reviewer cannot find specific chunk to verify

**Cause**: Chunk order may differ from source document
**Fix**: Use `source_page` and `source_section` fields to map chunks back to source PDF

### Issue: Embedding generation is slow

**Cause**: Large batch of chunks
**Fix**: Use incremental ingestion with `--batch-size 100`

## Appendix: Example Metadata

### WHO Document

```json
{
  "sourceDocument": "WHO PCPNC 2023",
  "sourceTitle": "Pregnancy, Childbirth, Postpartum and Newborn Care: A guide for essential practice",
  "sourceEdition": "3rd edition, 2023",
  "sourceUrl": "https://www.who.int/publications/i/item/9789240091672",
  "publisher": "World Health Organization",
  "publicationYear": 2023,
  "redistributionOk": true,
  "redistributionNotes": "WHO guidelines are in the public domain for non-commercial health use",
  "vertical": "CLINICAL",
  "clinicalStatus": "UNVERIFIED"
}
```

### UNFPA Document

```json
{
  "sourceDocument": "UNFPA Technical Guidance 2023",
  "sourceTitle": "UNFPA Technical Guidance: Clinical Protocols and Standards",
  "sourceUrl": "https://www.unfpa.org/resources",
  "publisher": "United Nations Population Fund",
  "publicationYear": 2023,
  "redistributionOk": true,
  "redistributionNotes": "UNFPA materials may be adapted for non-commercial health purposes",
  "vertical": "CLINICAL",
  "clinicalStatus": "UNVERIFIED"
}
```

## References

- WHO PCPNC 2023: https://www.who.int/publications/i/item/9789240091672
- WHO Model List of Essential Medicines: https://www.who.int/teams/health-products-and-policies/essential-medicines-and-health-products/publications/essential-medicines-lists/
- UNFPA Clinical Guidance: https://www.unfpa.org/resources
- Clinical Chunking Service: [next-app/services/clinicalChunkingService.ts](../next-app/services/clinicalChunkingService.ts)
- Validation Script: [scripts/validate-clinical-sources.ts](../scripts/validate-clinical-sources.ts)
