/**
 * Clinical docs library — reads metadata sidecars for the clinical knowledge
 * base. Each source is a paired .jsonl + .meta.json file under
 * docs/knowledge-base/{clinical,misp,chw}/.
 */

import * as fs from 'fs';
import * as path from 'path';

const KB_BASE = path.join(process.cwd(), '..', 'docs', 'knowledge-base');
const CLINICAL_VERTICALS = ['clinical', 'misp', 'chw'];

export interface ClinicalDocMeta {
  title?: string;
  shortName?: string;
  sourceDocument: string;
  sourceTitle: string;
  sourceEdition?: string;
  sourceUrl?: string;
  publisher: string;
  publicationYear: number;
  redistributionOk: boolean;
  redistributionNotes?: string;
  vertical: string;
  clinicalReviewer: string | null;
  reviewedAt: string | null;
  clinicalStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING_REVIEW' | 'DRAFT' | string;
  expiryDate?: string;
  contentType?: string;
  sections?: string[];
}

export interface ClinicalDocSummary {
  slug: string;
  meta: ClinicalDocMeta;
  chunkCount: number;
}

function deriveSlug(filename: string): string {
  return filename.replace(/\.jsonl$/, '').toLowerCase();
}

export function getAllClinicalDocs(): ClinicalDocSummary[] {
  const docs: ClinicalDocSummary[] = [];

  for (const vertical of CLINICAL_VERTICALS) {
    const dir = path.join(KB_BASE, vertical);
    if (!fs.existsSync(dir)) continue;

    const jsonlFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .sort();

    for (const file of jsonlFiles) {
      const metaPath = path.join(dir, file.replace(/\.jsonl$/, '.meta.json'));
      if (!fs.existsSync(metaPath)) continue;

      const meta: ClinicalDocMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const chunkCount = raw.split('\n').filter(l => l.trim().length > 0).length;

      docs.push({ slug: deriveSlug(file), meta, chunkCount });
    }
  }

  return docs;
}

export const PUBLISHER_ORDER = ['World Health Organization', 'UNFPA'];
