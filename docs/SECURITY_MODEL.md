# UNFPA OTG Clinical Knowledge Base - Security & Privacy Model

**Audience:** System administrators, security teams, compliance officers, clinical leadership  
**Last Updated:** April 12, 2026  
**Classification:** Confidential - Internal Use

---

## Executive Summary

This document outlines security and privacy controls for the UNFPA On-The-Ground clinical decision support system. The system prioritizes **clinical safety** and **user privacy** while enabling secure offline clinical access in resource-limited settings.

**Key Security Characteristics:**
- ✅ Cryptographically signed offline bundles (Ed25519)
- ✅ End-to-end encryption for clinical queries (HTTPS/TLS)
- ✅ Minimal personal data collection (aggregate analytics)
- ✅ Audit logging for clinical governance
- ✅ Network segmentation between clinical and operational data
- ✅ Regular security updates and vulnerability scanning

---

## Threat Model

### Identified Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| **Data Breach** - Attacker gains access to clinical audit logs | Low | High - Exposes clinician queries | Encryption at rest, RLS, access logging |
| **Offline Tampering** - Attacker modifies bundled knowledge base on device | Medium | High - False medical information | Ed25519 signatures, SHA-256 verification |
| **Man-in-the-Middle (MITM)** - Attacker intercepts bundle downloads | Low | High - Serves malicious bundle | HTTPS/TLS 1.3, pinned certificates |
| **Supply Chain Compromise** - Malicious actor introduces false medical content | Low | Critical | Clinical review process, metadata versioning |
| **Unauthorized Access** - Clinician shares device/credentials | Medium | Medium - Unattributed queries | Session timeouts, secure logout, device locks |
| **Denial of Service** - Attacker overloads API/bundles server | Low | Medium - Service unavailable | Rate limiting, load balancing, CDN |
| **Privacy Breach** - Clinical query logs leaking to third parties | Low | High | Encryption, role-based access, retention limits |

### Threat Actors

1. **Opportunistic Attackers** - Low sophistication, targets of convenience (outdated systems)
2. **Network Adversaries** - Medium sophistication, MITM attacks on WiFi/mobile networks
3. **Insider Threats** - High sophistication, accidental or malicious disclosure
4. **Nation-State** - Highest sophistication, targeted attacks (less likely for clinical app)

---

## Security Controls

### 1. Bundle Integrity (Offline Content Protection)

**Threat:** Attacker modifies medical content stored on device

**Controls:**

#### Ed25519 Digital Signatures

Every bundle is cryptographically signed with Ed25519:

```
Bundle Creation Flow:
┌──────────────────────────────────────────────┐
│ 1. Generate 384-dim embeddings                │
│ 2. Compress chunks into .tar.gz               │
│ 3. Calculate SHA-256(manifest)                │
│ 4. Sign SHA-256 with Ed25519 private key      │
│ 5. Store signature (base64) in manifest       │
└──────────────────────────────────────────────┘

Bundle Verification Flow (on mobile device):
┌──────────────────────────────────────────────┐
│ 1. Extract bundle from device storage         │
│ 2. Recalculate SHA-256(manifest)              │
│ 3. Load public key from app resources         │
│ 4. Verify signature with Ed25519 public key   │
│ 5. If VALID: Load bundle                      │
│   If INVALID: Reject and delete bundle        │
└──────────────────────────────────────────────┘
```

**Key Material Management:**
- Private key: Stored in Supabase secrets (not in version control)
- Public key: Embedded in app build, hardcoded in mobile apps
- Key rotation: Annually, with grace period for old keys
- Compromise response: Revoke key, issue emergency update

#### SHA-256 Checksum Verification

Each bundle includes checksums:

```json
{
  "version": "1.0.0",
  "bundles": {
    "clinical-bundle-v1.0.0.tar.gz": {
      "sha256": "a1b2c3d4...",
      "size": 87654321
    }
  }
}
```

Mobile app verifies checksum after download:
```typescript
const calculatedHash = crypto.createHash('sha256').update(bundleFile).digest('hex');
if (calculatedHash !== manifestHash) {
  throw new Error('Bundle integrity check failed');
}
```

### 2. Transport Security (In-Transit Data Protection)

**Threat:** Attacker intercepts clinical queries or bundles in transit

**Controls:**

#### HTTPS/TLS 1.3

All client-server communication uses TLS 1.3:

```
Client ←(TLS 1.3)→ API Gateway ←(TLS 1.2+)→ PostgreSQL
```

**Configuration:**
- Minimum TLS version: 1.2 (1.3 preferred)
- Strong ciphers: ECDHE-based (forward secrecy)
- Certificate: Valid HTTPS certificate from trusted CA
- HSTS: Enabled (Strict-Transport-Security header)

#### Certificate Pinning (for mobile apps)

Mobile apps pin the server certificate to prevent MITM attacks:

```swift
// iOS - Certificate Pinning
let publicKeyHashes = [
  "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
]
SessionConfiguration.pinningPolicy = CertificatePinningPolicy(
  publicKeyHashes: publicKeyHashes
)
```

```kotlin
// Android - Certificate Pinning
val certificatePinner = CertificatePinner.Builder()
  .add("api.unfpa-otg.org", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
  .build()
val client = OkHttpClient.Builder()
  .certificatePinner(certificatePinner)
  .build()
```

#### Secure Bundle Download

Bundle downloads use:
- HTTPS with certificate pinning
- Signed redirect URLs (expires after 1 hour)
- Resumable downloads (if interrupted)
- Automatic retry with backoff

### 3. Authentication & Authorization

**Threat:** Unauthorized access to API, audit logs, or administrative functions

**Controls:**

#### API Authentication

```
Mobile App ←(Bearer Token)→ API Gateway ←(JWT verification)→ Supabase Auth
```

**Types:**
- **Anonymous:** Public clinical search (no login needed)
- **User:** Logged-in clinician (email + password via Supabase)
- **Admin:** System administrator (API key + MFA)

**Session Management:**
- Session tokens expire after 30 days
- Refresh tokens expire after 90 days
- Logout clears tokens immediately
- Failed login attempts: Rate-limited (5 attempts/minute)

#### Role-Based Access Control (RBAC)

```sql
-- Clinical queries (anyone)
- GET /api/clinical/search
- GET /api/clinical/guidelines

-- Audit logs (authenticated users, own logs only)
- GET /api/logs/mine

-- Admin functions (admin role only)
- POST /api/bundles/publish
- DELETE /api/knowledge/:id
```

#### Row-Level Security (RLS) in PostgreSQL

```sql
-- Clinicians can only see their own audit logs
CREATE POLICY "see_own_logs" ON clinical_disclaimer_log
  USING (auth.uid()::text = user_id);

-- Admins can see all logs
CREATE POLICY "admin_sees_all" ON clinical_disclaimer_log
  USING (auth.jwt()->>'role' = 'admin');
```

### 4. Data at Rest (Database Encryption)

**Threat:** Attacker gains database access, reads sensitive audit logs

**Controls:**

#### Database Encryption

- **Supabase:** Encryption at rest enabled (AWS KMS)
- **Backups:** Encrypted to S3 with AES-256
- **User Data:** Clinical audit logs encrypted before storage

#### Access Controls

```sql
-- Only authenticated users can query
SELECT * FROM clinical_disclaimer_log WHERE user_id = auth.uid();

-- Audit logs older than 12 months are archived to separate encrypted storage
ARCHIVE clinical_disclaimer_log WHERE created_at < NOW() - INTERVAL '12 months';
```

#### Field-Level Encryption (for sensitive fields)

```sql
-- Optional: Encrypt user_id field using pgcrypto
UPDATE clinical_disclaimer_log
SET user_id = pgp_sym_encrypt(user_id, 'encryption_key')
WHERE created_at > NOW() - INTERVAL '90 days';
```

### 5. Audit Logging & Monitoring

**Threat:** Unauthorized use, data breach detection, forensics

**Controls:**

#### Clinical Query Logging

Every clinical search is logged with:

```json
{
  "timestamp": "2026-04-12T10:30:00Z",
  "session_id": "sess_abc123",
  "user_id": "user_xyz789",  // nullable (allows anonymous queries)
  "country": "Uganda",
  "language": "en",
  "question": "postpartum hemorrhage management",
  "answer_preview": "[truncated to first 500 chars]",
  "citation_chunks": ["chunk_id_1", "chunk_id_2"],
  "validator_passed": true,
  "validator_warnings": [],
  "has_dose_card": true
}
```

**Why we log:**
- Clinical governance: Ensure clinicians are using system appropriately
- Usage analytics: Understand which topics are most needed
- Quality assurance: Identify missing content or inaccuracies
- Safety monitoring: Detect unusual query patterns

#### Security Event Logging

```
API Access Logs:
- All API requests (timestamp, method, endpoint, user, IP)
- Response status and latency
- Authentication successes and failures
- Rate-limiting triggers

Database Logs:
- Access to sensitive tables
- Data modifications (INSERT, UPDATE, DELETE)
- Schema changes
- Backup operations
```

#### Log Retention & Archival

| Log Type | Retention | Retention Reason |
|----------|-----------|------------------|
| Clinical Queries | 12 months | Audit trail, governance |
| API Access | 90 days | Security incident investigation |
| Database Changes | 30 days | Rollback capabilities |
| Authentication | 90 days | Account compromise detection |

---

## Privacy Controls

### Data Minimization

**Principle:** Collect only data necessary for clinical support and governance

**Data Collected:**
- Clinical queries (what you searched for)
- Aggregate metadata (country, language, timestamp)
- Query results (which chunks were returned)
- Validator feedback (if dose info is accurate)

**Data NOT Collected:**
- Patient names or identifiers
- Patient medical records
- Clinician location or tracking
- Device identifiers or IMEI
- Keystroke patterns or behavioral analytics
- Third-party data sharing

### Consent & Transparency

**Before Using Clinical Features:**
1. User reads clinical disclaimer
2. User must acknowledge understanding
3. Agreement stored in audit log

**Disclaimer Text:**
> This system provides evidence-based clinical decision support based on WHO guidelines. It is NOT a substitute for professional judgment. All clinical decisions remain your responsibility. Your queries will be logged for clinical governance purposes and retained for 12 months.

### User Rights

**Users have the right to:**
1. **Access:** Request copy of their audit logs (within 30 days)
2. **Deletion:** Request deletion of old logs (>12 months automatically deleted)
3. **Transparency:** Know what data is collected and why
4. **Objection:** Not provide country/language data (still functional)

**How to exercise rights:**
- Email [privacy@unfpa-otg.org]
- Include session ID or date range of queries
- Response within 30 days

### GDPR/HIPAA Compliance

**GDPR (if applicable):**
- ✅ Lawful basis: Legitimate interest (clinical governance)
- ✅ Data processing agreement: Supabase DPA signed
- ✅ Data subject rights: Implemented (access, deletion)
- ✅ Privacy by design: Minimized data collection
- ✅ Right to be forgotten: 12-month archival, then deletion

**HIPAA (if in US):**
- ⚠️ This system is NOT HIPAA-compliant as-is
- If used in HIPAA-covered entity: Requires additional controls (encryption, access logging, audit reports)
- Recommendation: Use behind secure VPN, enable additional encryption

---

## Vulnerability Management

### Dependency Scanning

```bash
# Weekly automated scanning
npm audit --production

# Security updates applied within:
- Critical: 48 hours
- High: 1 week
- Medium: 2 weeks
- Low: 30 days
```

### Code Review & Static Analysis

```bash
# Pre-commit scanning
npm run security:check

# Includes:
- Secret scanning (no API keys in code)
- Dependency vulnerability check
- Code quality checks
- TypeScript strict mode
```

### Penetration Testing

- **Annual:** Professional penetration test by third-party
- **Scope:** API endpoints, mobile apps, bundle integrity
- **Findings:** Tracked and remediated before deployment

### Security Incident Response

**Process:**
1. **Detection** → Automated alerts or manual report
2. **Assessment** → Determine severity (Critical/High/Medium/Low)
3. **Response** → Immediate action (disable access, apply fix, etc.)
4. **Investigation** → Root cause analysis, forensics
5. **Communication** → Notify affected users if needed
6. **Remediation** → Deploy fix, verify resolution

**Timeline:**
- **Critical:** Escalation within 1 hour, fix within 24 hours
- **High:** Assessment within 4 hours, fix within 7 days
- **Medium:** Assessment within 1 business day, fix within 30 days

---

## Compliance & Certifications

### Current Status
- ✅ HTTPS/TLS encryption
- ✅ Automated dependency scanning
- ✅ Signed bundle integrity
- ✅ Audit logging and retention
- ⏳ ISO 27001 certification (in progress)

### Roadmap
- 📅 ISO 27001 (Information Security Management) - Q3 2026
- 📅 SOC 2 Type II (Security Controls) - Q4 2026
- 📅 HIPAA BAA (if US deployment needed) - Q2 2027

---

## Security Best Practices for Users

### For Clinicians

1. **Protect Your Device:**
   - Use device passcode
   - Enable biometric lock
   - Keep OS and apps updated

2. **Manage Sessions:**
   - Logout when done
   - Don't share device
   - Don't use public WiFi for sensitive queries

3. **Report Issues:**
   - If device is lost/stolen, notify IT immediately
   - Report suspicious app behavior
   - Contact [security@unfpa-otg.org] for vulnerabilities

### For Administrators

1. **Regular Updates:**
   - Check for bundle updates weekly
   - Apply API updates monthly
   - Patch critical vulnerabilities within 48 hours

2. **Monitoring:**
   - Review audit logs weekly
   - Monitor API latency and errors
   - Check storage usage

3. **Access Control:**
   - Use strong passwords (16+ characters)
   - Enable multi-factor authentication
   - Rotate admin credentials quarterly

---

## Security Contact

**Report Security Issues To:**  
[security@unfpa-otg.org]

**Do NOT:**
- Open public GitHub issues for security vulnerabilities
- Send credentials or sensitive data in email
- Disclose vulnerabilities to third parties

**We will:**
- Acknowledge receipt within 24 hours
- Provide status updates every 7 days
- Fix and deploy patch within agreed timeframe
- Credit you in security advisory (if desired)

---

## Appendix: Cryptographic Details

### Ed25519 Signature Scheme

**Algorithm:** EdDSA with Curve25519  
**Key Size:** 256-bit private key, 256-bit public key  
**Signature Size:** 512 bits (64 bytes)  
**Security:** ~128-bit symmetric strength

**Why Ed25519?**
- Fast and resistant to timing attacks
- No need for random number generator
- Smaller keys than RSA (256 vs 2048 bits)
- Proven implementation (NaCl/libsodium)

### SHA-256 Hash Function

**Algorithm:** SHA-2 family (256-bit)  
**Output:** 256 bits (32 bytes)  
**Use:** Bundle integrity verification  
**Security:** Cryptographically secure (no known attacks)

### AES-256 Encryption

**Algorithm:** AES (Advanced Encryption Standard)  
**Key Size:** 256 bits  
**Mode:** GCM (authenticated encryption)  
**Use:** Data at rest, optional field-level encryption

---

**Version Control:**
- **1.0.0** (Apr 12, 2026) - Initial security model
- Security reviews scheduled: Quarterly

**Next Review Date:** July 12, 2026
