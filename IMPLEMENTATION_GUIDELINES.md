# Clinical Knowledge Base Implementation Guidelines

## For Development Team

This document provides guidelines for implementing clinical knowledge features across the UNFPA OTG application.

## Clinical Content Standards

### Citation Requirements
Every piece of clinical information must include:
- **sourceDocument**: WHO/UNFPA guideline name (e.g., "WHO PCPNC 2023")
- **sourcePage**: Exact page number in source
- **sourceUrl**: Online verification link
- **sourceSection**: Specific section reference (e.g., "Section 3.2 — AMTSL")
- **expiryDate**: When content review is due

Example citation:
```json
{
  "sourceDocument": "WHO PCPNC 3rd ed. 2023",
  "sourceSection": "C3 - Preventing Postpartum Haemorrhage",
  "sourcePage": 89,
  "sourceUrl": "https://www.who.int/publications/i/item/9789240091672",
  "expiryDate": "2026-12-31"
}
```

### Content Accuracy
- All clinical protocols must reference WHO Essential Medicines List or WHO guidelines
- Drug information must include dose, route, timing, contraindications
- Multi-language support for drug names (minimum: English, one regional language)
- Warnings and precautions must be included
- No personal medical advice or diagnosis

### Chunking Guidelines
- **Clinical tables**: Never split mid-row; keep as atomic chunks
- **Protocol lists**: Keep numbered protocols together
- **Target size**: 800-1200 words per chunk
- **Overlap**: 80-word overlap between chunks for context
- **Prefix format**: Include document title and section heading in every chunk

Example:
```markdown
# WHO PCPNC 2023
## C3 — Preventing Postpartum Haemorrhage

### Oxytocin in Active Management...
[content with proper formatting]
```

## Database Integration

### Adding a New Clinical Source

1. **Prepare PDF**
   - Extract from WHO/UNFPA official publication
   - Create `.pdf` file in `docs/knowledge-base/clinical/`

2. **Create metadata file**
   ```json
   {
     "title": "WHO PCPNC 2023",
     "shortName": "WHO-PCPNC-2023",
     "publisher": "World Health Organization",
     "edition": "3rd edition",
     "publicationYear": 2023,
     "sourceUrl": "https://www.who.int/...",
     "redistributionOk": true,
     "clinicalReviewer": "Dr. Name",
     "expiryDate": "2026-12-31"
   }
   ```
   Save as `[document].meta.json`

3. **Ingest into database**
   ```bash
   npx ts-node scripts/ingest-clinical.ts \
     --file docs/knowledge-base/clinical/who-pcpnc-2023.pdf \
     --vertical CLINICAL
   ```

4. **Verify ingestion**
   ```bash
   npx ts-node scripts/validate-clinical-sources.ts
   ```

### Adding Drugs to Formulary

1. **Edit** `docs/knowledge-base/formulary/formulary.json`
2. **Add entry** with:
   - Drug name (generic and local names)
   - Indication, dose, route, timing
   - Contraindications and warnings
   - WHO EML listing status
   - Source citation with page number
   - Clinical review status

3. **Ingest into database**
   ```bash
   npx ts-node scripts/ingest-clinical.ts --formulary
   ```

4. **Mark as reviewed** once clinically approved:
   ```json
   {
     "drug": "oxytocin",
     "clinicalStatus": "REVIEWED-APPROVED",
     "reviewedBy": "Dr. Name",
     "reviewedAt": "2026-04-10T12:00:00Z"
   }
   ```

## Web App Integration

### Using Clinical Search

```typescript
// Search for clinical guidance
const results = await fetch('/api/clinical/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'oxytocin dosing postpartum haemorrhage',
    limit: 5
  })
});

// Response includes citations
{
  "results": [{
    "content": "...",
    "sourceDocument": "WHO PCPNC 2023",
    "sourcePage": 89,
    "sourceUrl": "...",
    "relevanceScore": 0.94
  }]
}
```

### Using Drug Lookup

```typescript
// Get drug information
const drug = await fetch('/api/clinical/formulary?drug=oxytocin');

// Response
{
  "drug": "oxytocin",
  "dose": "10 IU",
  "route": "IM",
  "contraindications": [...],
  "whoEmlListed": true,
  "reviewed": true,
  "reviewedAt": "2026-04-10"
}
```

### Displaying Citations

```tsx
// Citation component
<CitationDrawer
  source={{
    document: "WHO PCPNC 2023",
    section: "C3 — Preventing PPH",
    page: 89,
    url: "https://..."
  }}
/>
```

## Mobile Implementation

### Offline Access Pattern

```kotlin
// Android example
class ClinicalRepository(private val db: AppDatabase) {
  
  // Search clinical knowledge
  suspend fun searchClinical(query: String): List<KnowledgeChunk> {
    // 1. Generate embedding for query
    val embedding = embeddingEngine.embed(query)
    
    // 2. Vector similarity search
    return db.knowledgeChunkDao()
      .searchByEmbedding(embedding, limit = 10)
  }
  
  // Get drug information
  fun getDrug(drugName: String): FormularyEntry? {
    return db.formularyDao()
      .getByLocalName(drugName) // Case-insensitive
  }
  
  // Get citations for verification
  fun getCitations(chunkId: String): List<Citation> {
    val chunk = db.knowledgeChunkDao().getById(chunkId)
    return listOf(
      Citation(
        document = chunk.sourceDocument,
        page = chunk.sourcePage,
        url = chunk.sourceUrl
      )
    )
  }
}
```

### Bundle Download and Verification

```kotlin
// Download and verify bundle
class BundleManager(private val httpClient: HttpClient) {
  
  suspend fun downloadLatestBundle(): File {
    // 1. Download bundle
    val response = httpClient.get("/api/mobile/bundle/latest")
    val bundleFile = File(context.cacheDir, "bundle.zip")
    bundleFile.writeBytes(response.body())
    
    // 2. Verify signature
    val manifest = extractManifest(bundleFile)
    val signature = manifest.signature
    val isValid = verifySignature(
      data = manifest.toJson(),
      signature = signature,
      publicKey = TRUSTED_PUBLIC_KEY
    )
    
    if (!isValid) {
      throw SecurityException("Invalid bundle signature")
    }
    
    // 3. Extract and install
    extractBundle(bundleFile)
    return bundleFile
  }
}
```

## Testing Checklist

- [ ] All drugs in formulary are searchable
- [ ] Clinical documents chunk without splitting tables
- [ ] Citations are properly linked to sources
- [ ] Bundle generation is deterministic
- [ ] Bundle signature verification works
- [ ] Offline search is fast (<500ms)
- [ ] Multi-language drug names work
- [ ] Web app clinical chat returns cited responses
- [ ] Android can download and verify bundles
- [ ] iOS can access content offline
- [ ] No sensitive data in logs
- [ ] Performance acceptable on 2G networks

## Security Considerations

### Bundle Verification
- Always verify Ed25519 signature before extraction
- Keep public key in app binary
- Fail safely if signature invalid

### Data Privacy
- No user clinical queries stored without consent
- Clinical history stored locally only
- Encryption at rest on device
- No analytics on sensitive medical data

### Content Updates
- Version bundles semantically (YYYY.MM.DD)
- Support rollback to previous version
- Delta updates for incremental changes
- Mandatory signatures for all updates

## Performance Optimization

### Mobile Search
- Pre-compute embeddings server-side
- Use quantized embeddings on device
- Implement caching layer
- Batch similarity searches

### Web App
- Use vector database for fast retrieval
- Implement result caching
- Paginate large result sets
- Lazy-load citations

## Monitoring and Maintenance

### Health Checks
- Bundle download success rate
- Signature verification failures
- Search performance metrics
- Citation link validity

### Regular Tasks
- Monthly: Review clinical content for expiry
- Quarterly: Update from new WHO/UNFPA guidelines
- Annually: Full clinical audit and recertification

---

**Version**: 1.0
**Last Updated**: 2026-04-10
