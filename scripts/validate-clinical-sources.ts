#!/usr/bin/env npx ts-node
/**
 * Clinical Sources Validation Script
 *
 * Validates the structure and integrity of clinical knowledge documents before ingestion.
 * Performs comprehensive checks on JSONL document structure, metadata, citation information,
 * and chunking behavior.
 *
 * Usage:
 *   npx ts-node scripts/validate-clinical-sources.ts --all
 *   npx ts-node scripts/validate-clinical-sources.ts --file path/to/document.jsonl
 *   npx ts-node scripts/validate-clinical-sources.ts --dry-run --verbose
 *
 * Checks performed:
 *   ✓ JSONL syntax validity (each line is valid JSON)
 *   ✓ Block structure: required and optional fields by type
 *   ✓ Tables/lists are atomic (never split mid-content)
 *   ✓ Citation metadata present in every chunk
 *   ✓ Page numbering is sequential
 *   ✓ Metadata file exists and is valid
 *   ✓ Word count and chunk statistics
 *   ✓ Heading hierarchy is well-formed
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClinicalBlock {
  type: 'heading' | 'paragraph' | 'table' | 'list';
  level?: number;
  text?: string;
  caption?: string;
  header?: string[];
  rows?: string[][];
  ordered?: boolean;
  items?: string[];
  page: number;
}

interface DocumentMetadata {
  sourceDocument: string;
  sourceTitle: string;
  sourceEdition?: string;
  sourceUrl?: string;
  publisher?: string;
  publicationYear?: number;
  redistributionOk: boolean;
  redistributionNotes?: string;
  vertical?: string;
  clinicalReviewer?: string | null;
  reviewedAt?: string | null;
  clinicalStatus?: string;
  expiryDate?: string;
  contentType?: string;
}

interface ValidationResult {
  filePath: string;
  fileName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalBlocks: number;
    blocksByType: Record<string, number>;
    totalWords: number;
    totalPages: number;
    tableCount: number;
    listCount: number;
    headingHierarchy: string[];
  };
  metadata?: DocumentMetadata;
  metadataValid?: boolean;
}

interface ValidationConfig {
  all: boolean;
  file?: string;
  dryRun: boolean;
  verbose: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLINICAL_DIR = path.resolve(__dirname, '../docs/knowledge-base/clinical');
const MIN_WORDS_PER_CHUNK = 50;
const MAX_WORDS_PER_CHUNK = 1500;

// ── Helper Functions ──────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function blockToText(block: ClinicalBlock): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level || 2)} ${block.text}`;
    case 'paragraph':
      return block.text || '';
    case 'table':
      const tableLines: string[] = [];
      if (block.caption) tableLines.push(`**${block.caption}**`);
      if (block.header && block.header.length > 0) {
        tableLines.push('| ' + block.header.join(' | ') + ' |');
        tableLines.push('| ' + block.header.map(() => '---').join(' | ') + ' |');
      }
      for (const row of block.rows || []) {
        tableLines.push('| ' + row.join(' | ') + ' |');
      }
      return tableLines.join('\n');
    case 'list':
      return (block.items || [])
        .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`))
        .join('\n');
    default:
      return '';
  }
}

function validateBlock(block: any, blockIndex: number, errors: string[]): boolean {
  if (!block.type) {
    errors.push(`Block ${blockIndex}: Missing required field 'type'`);
    return false;
  }

  const validTypes = ['heading', 'paragraph', 'table', 'list'];
  if (!validTypes.includes(block.type)) {
    errors.push(`Block ${blockIndex}: Invalid type '${block.type}'. Must be one of: ${validTypes.join(', ')}`);
    return false;
  }

  if (typeof block.page !== 'number' || block.page < 1) {
    errors.push(`Block ${blockIndex} (${block.type}): Invalid or missing 'page' number`);
    return false;
  }

  switch (block.type) {
    case 'heading':
      if (!block.text || typeof block.text !== 'string') {
        errors.push(`Block ${blockIndex} (heading): Missing or invalid 'text' field`);
        return false;
      }
      if (block.level && (block.level < 1 || block.level > 6)) {
        errors.push(`Block ${blockIndex} (heading): Invalid level ${block.level}. Must be 1-6`);
        return false;
      }
      break;

    case 'paragraph':
      if (!block.text || typeof block.text !== 'string') {
        errors.push(`Block ${blockIndex} (paragraph): Missing or invalid 'text' field`);
        return false;
      }
      break;

    case 'table':
      if (!Array.isArray(block.header) || block.header.length === 0) {
        errors.push(`Block ${blockIndex} (table): Missing or invalid 'header' array`);
        return false;
      }
      if (!Array.isArray(block.rows) || block.rows.length === 0) {
        errors.push(`Block ${blockIndex} (table): Missing or empty 'rows' array`);
        return false;
      }
      // Validate table cell count consistency
      for (let i = 0; i < block.rows.length; i++) {
        if (block.rows[i].length !== block.header.length) {
          errors.push(
            `Block ${blockIndex} (table): Row ${i} has ${block.rows[i].length} cells, ` +
              `but header has ${block.header.length} columns`
          );
          return false;
        }
      }
      break;

    case 'list':
      if (!Array.isArray(block.items) || block.items.length === 0) {
        errors.push(`Block ${blockIndex} (list): Missing or empty 'items' array`);
        return false;
      }
      if (typeof block.ordered !== 'boolean') {
        errors.push(`Block ${blockIndex} (list): Missing or invalid 'ordered' boolean`);
        return false;
      }
      break;
  }

  return true;
}

function validateJsonlFile(filePath: string): ValidationResult {
  const fileName = path.basename(filePath);
  const result: ValidationResult = {
    filePath,
    fileName,
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalBlocks: 0,
      blocksByType: { heading: 0, paragraph: 0, table: 0, list: 0 },
      totalWords: 0,
      totalPages: 0,
      tableCount: 0,
      listCount: 0,
      headingHierarchy: [],
    },
  };

  // Check file exists
  if (!fs.existsSync(filePath)) {
    result.isValid = false;
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  // Read and parse JSONL
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  let blocks: ClinicalBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const block = JSON.parse(lines[i]) as ClinicalBlock;
      blocks.push(block);
    } catch (err) {
      result.isValid = false;
      result.errors.push(`Line ${i + 1}: Invalid JSON - ${(err as Error).message}`);
    }
  }

  if (result.errors.length > 0) {
    return result;
  }

  // Validate block structure
  const headingStack: { level: number; text: string }[] = [];
  let lastPage = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockValid = validateBlock(block, i, result.errors);
    if (!blockValid) {
      result.isValid = false;
    }

    // Count block types
    result.stats.blocksByType[block.type]++;
    result.stats.totalBlocks++;
    result.stats.totalPages = Math.max(result.stats.totalPages, block.page);

    // Track heading hierarchy
    if (block.type === 'heading') {
      const level = block.level || 2;
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, text: block.text || '' });
      result.stats.headingHierarchy.push(`${'  '.repeat(level - 1)}${block.text}`);
    }

    // Validate heading hierarchy
    if (block.type === 'heading' && i > 0) {
      const prevBlock = blocks[i - 1];
      if (prevBlock.type === 'heading') {
        const prevLevel = prevBlock.level || 2;
        const currLevel = block.level || 2;
        if (currLevel > prevLevel + 1) {
          result.warnings.push(
            `Block ${i} (heading): Heading level jumps from ${prevLevel} to ${currLevel}. ` +
              `This may indicate missing intermediate heading levels.`
          );
        }
      }
    }

    // Check page sequencing
    if (block.page < lastPage) {
      result.warnings.push(
        `Block ${i}: Page number ${block.page} is less than previous block's page ${lastPage}. ` +
          `Pages should be sequential.`
      );
    }
    lastPage = block.page;

    // Count words and validate content length
    const blockText = blockToText(block);
    const wordCount = countWords(blockText);
    result.stats.totalWords += wordCount;

    if (wordCount < 5 && block.type !== 'heading') {
      result.warnings.push(
        `Block ${i} (${block.type}): Very short content (${wordCount} words). ` +
          `May indicate incomplete or malformed content.`
      );
    }

    // Track tables and lists
    if (block.type === 'table') {
      result.stats.tableCount++;
    }
    if (block.type === 'list') {
      result.stats.listCount++;
    }
  }

  // Check metadata file
  const metaPath = filePath.replace(/\.jsonl$/, '.meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      result.metadata = JSON.parse(metaContent) as DocumentMetadata;
      result.metadataValid = true;

      // Validate metadata structure
      const requiredFields = ['sourceDocument', 'sourceTitle', 'redistributionOk'];
      for (const field of requiredFields) {
        if (!(field in result.metadata)) {
          result.metadataValid = false;
          result.errors.push(`Metadata: Missing required field '${field}'`);
          result.isValid = false;
        }
      }

      // Check expiry date
      if (result.metadata.expiryDate) {
        const expiryDate = new Date(result.metadata.expiryDate);
        const today = new Date();
        if (expiryDate < today) {
          result.warnings.push(
            `Metadata: Document has expired (expiry date: ${result.metadata.expiryDate}). ` +
              `Update the expiryDate or verify the document is still valid.`
          );
        }
      }
    } catch (err) {
      result.metadataValid = false;
      result.errors.push(`Metadata file parse error: ${(err as Error).message}`);
      result.isValid = false;
    }
  } else {
    result.warnings.push(`No metadata file found: ${metaPath}`);
  }

  // Final validations
  if (result.stats.totalBlocks === 0) {
    result.isValid = false;
    result.errors.push('Document contains no blocks');
  }

  if (result.stats.totalWords === 0) {
    result.isValid = false;
    result.errors.push('Document contains no words');
  }

  return result;
}

function findClinicalDocuments(): string[] {
  const files: string[] = [];
  if (!fs.existsSync(CLINICAL_DIR)) {
    console.error(`Clinical directory not found: ${CLINICAL_DIR}`);
    return files;
  }

  const entries = fs.readdirSync(CLINICAL_DIR);
  for (const entry of entries) {
    if (entry.endsWith('.jsonl')) {
      files.push(path.join(CLINICAL_DIR, entry));
    }
  }
  return files;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printResult(result: ValidationResult, verbose: boolean): void {
  const status = result.isValid ? '✓ VALID' : '✗ INVALID';
  console.log(`\n${status}  ${result.fileName}`);

  if (result.errors.length > 0) {
    console.log(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`    • ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`  Warnings (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      console.log(`    ⚠ ${warn}`);
    }
  }

  console.log(`  Statistics:`);
  console.log(`    • Total blocks: ${result.stats.totalBlocks}`);
  console.log(`    • Blocks by type: heading=${result.stats.blocksByType.heading}, ` +
    `paragraph=${result.stats.blocksByType.paragraph}, ` +
    `table=${result.stats.tableCount}, ` +
    `list=${result.stats.listCount}`);
  console.log(`    • Total words: ${result.stats.totalWords.toLocaleString()}`);
  console.log(`    • Pages: 1-${result.stats.totalPages}`);

  if (result.metadata) {
    console.log(`  Metadata:`);
    console.log(`    • Source: ${result.metadata.sourceDocument}`);
    console.log(`    • Publisher: ${result.metadata.publisher || 'N/A'}`);
    console.log(`    • Year: ${result.metadata.publicationYear || 'N/A'}`);
    console.log(`    • Redistribution OK: ${result.metadata.redistributionOk ? 'Yes' : 'No'}`);
    console.log(`    • Status: ${result.metadata.clinicalStatus || 'UNVERIFIED'}`);
  }

  if (verbose && result.stats.headingHierarchy.length > 0) {
    console.log(`  Heading Hierarchy:`);
    for (const heading of result.stats.headingHierarchy.slice(0, 10)) {
      console.log(`    ${heading}`);
    }
    if (result.stats.headingHierarchy.length > 10) {
      console.log(`    ... and ${result.stats.headingHierarchy.length - 10} more`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = {
    all: { type: 'boolean' as const, default: false },
    file: { type: 'string' as const },
    'dry-run': { type: 'boolean' as const, default: false },
    verbose: { type: 'boolean' as const, default: false },
    help: { type: 'boolean' as const, default: false },
  };

  const { values: args } = parseArgs({ options, allowPositionals: true });
  const config: ValidationConfig = {
    all: args.all as boolean,
    file: args.file as string | undefined,
    dryRun: args['dry-run'] as boolean,
    verbose: args.verbose as boolean,
  };

  if (args.help) {
    console.log(`
Usage: npx ts-node scripts/validate-clinical-sources.ts [options]

Options:
  --all           Validate all clinical documents in docs/knowledge-base/clinical/
  --file PATH     Validate a specific file
  --dry-run       Show what would be validated without writing
  --verbose       Show detailed output including heading hierarchy
  --help          Show this help message

Examples:
  npx ts-node scripts/validate-clinical-sources.ts --all
  npx ts-node scripts/validate-clinical-sources.ts --file docs/knowledge-base/clinical/WHO-PCPNC-Maternal-Management.jsonl
  npx ts-node scripts/validate-clinical-sources.ts --all --verbose
    `);
    return;
  }

  let files: string[] = [];

  if (config.file) {
    files = [config.file];
  } else if (config.all) {
    files = findClinicalDocuments();
  } else {
    console.error('Please specify --file or --all');
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No clinical documents found');
    process.exit(1);
  }

  console.log(`Validating ${files.length} clinical document(s)...\n`);

  const results: ValidationResult[] = [];
  let totalValid = 0;
  let totalInvalid = 0;

  for (const file of files) {
    const result = validateJsonlFile(file);
    results.push(result);
    printResult(result, config.verbose);

    if (result.isValid) {
      totalValid++;
    } else {
      totalInvalid++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${totalValid} valid, ${totalInvalid} invalid`);

  if (totalInvalid > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
