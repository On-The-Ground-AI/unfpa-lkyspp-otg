# UNFPA On-The-Ground Web App

A Next.js web application for UNFPA-supported health facilities, providing clinical reference, knowledge base chat, and resource management tools.

## Features

### Clinical Knowledge Integration

- **Clinical Chat** (`/clinical-chat`) - Dedicated interface for clinical queries with:
  - Semantic search over WHO guidelines and clinical protocols
  - Automatic citation of sources with page numbers
  - Drug formulary lookups and dose calculations
  - Evidence level badges (guideline, protocol, formulary-verified)
  - Low-bandwidth optimization for remote settings

- **Clinical RAG Service** - Retrieval-augmented generation for medical queries:
  - Knowledge base search with clinical-specific ranking
  - Formulary validation and drug verification
  - Clinical guideline retrieval by condition
  - Audit logging for clinical governance

- **Drug & Formulary Tools**:
  - Formulary search API (`/api/clinical/formulary`)
  - Dose calculator for weight-based dosing
  - WHO Essential Medicines List (EML) status indicators
  - Contraindication and warning display

### Knowledge Base

- **Knowledge Chat** - Search institutional knowledge with semantic embeddings
- **Semantic Search** - Vector similarity search over documents
- **Citation Tracking** - All responses include source references
- **Multiple Verticals** - Support for clinical, community, partnership knowledge bases

### Administration

- **Admin Knowledge Panel** - Document ingestion and management
- **PDF Chunking** - Automatic document splitting for optimal search
- **Embedding Generation** - Vector embeddings for semantic search

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- OpenAI API key (for embeddings)
- Anthropic API key (for Claude integration)

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/unfpa"

# AI Services
ANTHROPIC_API_KEY="your-anthropic-key"
OPENAI_API_KEY="your-openai-key"

# Embeddings
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npm run seed
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Clinical Features Documentation

### Clinical Chat API

**Endpoint**: `POST /api/chat`

Request:
```json
{
  "message": "What is the dose of oxytocin for AMTSL?",
  "mode": "clinical",
  "country": "Myanmar",
  "language": "en",
  "conversationHistory": []
}
```

Response (SSE stream):
```
event: status
data: {"phase": "thinking", "message": "Analyzing your question..."}

event: text_delta
data: {"text": "Oxytocin 10 IU IM..."}

event: done
data: {"sources": [...], "fullText": "..."}
```

### Clinical Search API

**Endpoint**: `POST /api/clinical/search`

Search the clinical knowledge base with semantic similarity:

```bash
curl -X POST http://localhost:3000/api/clinical/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "magnesium sulphate eclampsia loading dose",
    "limit": 5,
    "threshold": 0.6,
    "includeFormulary": true
  }'
```

Response:
```json
{
  "chunks": [
    {
      "documentTitle": "WHO PCPNC 2023",
      "chunkContent": "...",
      "sourceDocument": "WHO PCPNC 2023",
      "sourceSection": "Section 3.2",
      "sourcePage": 47,
      "similarity": 0.92,
      "evidenceLevel": "guideline"
    }
  ],
  "formularyEntries": [
    {
      "drug": "magnesium sulfate",
      "dose": "4-5 grams",
      "route": "IV",
      "indication": "Eclampsia prophylaxis",
      "whoEmlListed": true
    }
  ],
  "totalResults": 6
}
```

### Formulary Lookup API

**Endpoint**: `POST /api/clinical/formulary` or `GET /api/clinical/formulary?drug=oxytocin`

```bash
curl -X POST http://localhost:3000/api/clinical/formulary \
  -H "Content-Type: application/json" \
  -d '{
    "drugs": ["oxytocin", "misoprostol"],
    "limit": 10
  }'
```

Response:
```json
{
  "entries": [
    {
      "id": "...",
      "drug": "oxytocin",
      "dose": "10 IU",
      "route": "IM",
      "indication": "Active management of third stage of labour",
      "contraindications": ["Hypertension", "Pre-eclampsia"],
      "warnings": ["Risk of rupture if uterus over-distended"],
      "source": "WHO PCPNC 2023, Section 3.2, Page 47",
      "whoEmlListed": true
    }
  ],
  "totalResults": 1
}
```

### Clinical Guidelines API

**Endpoint**: `POST /api/clinical/guidelines`

Retrieve clinical guidelines by condition:

```bash
curl -X POST http://localhost:3000/api/clinical/guidelines \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "postpartum hemorrhage",
    "limit": 3,
    "threshold": 0.65
  }'
```

## Services

### Clinical RAG Service

Located in `services/clinicalRagService.ts`

Key functions:
- `searchClinicalKnowledge(query, options)` - Semantic search with clinical ranking
- `searchFormulary(drugNames)` - Drug formulary lookup
- `searchClinicalGuidelines(condition)` - Guidelines by condition
- `validateDrugCitation(drug, dose, route)` - Validate against formulary
- `logClinicalAnswer(...)` - Audit logging for governance

### Clinical Chunking Service

Located in `services/clinicalChunkingService.ts`

Features:
- Preserves table structure (never splits tables mid-row)
- Maintains heading context in every chunk
- Records source page numbers for citations
- Generates table captions for improved embedding quality
- Keeps numbered clinical protocols intact

## UI Components

### ClinicalCitationDrawer
- Opens from [SRC:...] citation tags
- Shows full source metadata
- Displays chunk preview
- Links to source URL

### DrugLookup
- Searchable formulary interface
- Displays contraindications and warnings
- WHO EML status indicators
- Source attribution

### DoseCalculator
- Weight-based dosing (mg/kg)
- Age-based standard doses
- Unit conversion support
- Output formatted for quick reference

### ClinicalEvidenceBadge
- Evidence level indicators (guideline, protocol, formulary)
- WHO EML status
- Verification badges
- Accessible color-coding

## Data Models

### KnowledgeChunk
```prisma
model KnowledgeChunk {
  id                String
  content          String
  embedding        vector(1536)
  sourceDocument   String?  // e.g., "WHO PCPNC 2023"
  sourceSection    String?  // e.g., "Section 3.2"
  sourcePage       Int?     // Page number
  sourceUrl        String?
  clinicalSourceId String?  // Link to ClinicalSource
}
```

### FormularyEntry
```prisma
model FormularyEntry {
  id               String
  drug             String
  dose             String
  route            String
  indication       String
  contraindications Json?
  warnings         Json?
  whoEmlListed     Boolean
  source           String
}
```

### ClinicalDisclaimerLog
Audit log for all clinical mode responses:
```prisma
model ClinicalDisclaimerLog {
  sessionId         String
  mode              String // clinical | community
  question          String
  answer            String
  citationChunkIds  Json[] // All [SRC:...] references
  validatorPassed   Boolean
  validatorWarnings Json?
}
```

## Citation Standards

All clinical information must include citations in the format: `[SRC:document_slug-chunk_index]`

Example:
> "Administer oxytocin 10 IU intramuscularly within 1 minute of delivery of the baby [SRC:who-pcpnc-2023-3] to prevent postpartum hemorrhage."

## Accessibility

- High contrast for clinical reference materials
- Keyboard navigation for clinical environments
- Offline support for key drugs and protocols
- Low-bandwidth optimization (no inline images)
- Large touch targets for clinical settings

## Security

- All clinical queries are logged for audit
- Formulary entries are human-verified
- No LLM-generated dosing information
- Source citations are mandatory
- Clinical answers cannot include undisclaimed information

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Anthropic Claude API](https://docs.anthropic.com/)

## Contributing

See the main repository README for contribution guidelines.

## License

UNFPA proprietary. All rights reserved.
