/**
 * Document Chunking Service
 *
 * Splits markdown documents into embedding-optimized chunks.
 * Strategy:
 * 1. Split on markdown headings as natural boundaries
 * 2. If a section exceeds maxWords, split on paragraph breaks
 * 3. Each chunk includes the document title + section heading as prefix
 * 4. ~100 word overlap between consecutive chunks
 */

import type { Chunk, ChunkOptions } from '@/types/corpus';
import { estimateTokenCount } from './embeddingService';

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetWords: 1000,
  maxWords: 1200,
  minWords: 200,
  overlapWords: 100,
};

interface Section {
  heading: string;
  content: string;
  level: number;
}

export function chunkDocument(
  content: string,
  documentTitle: string,
  options?: ChunkOptions
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections = splitIntoSections(content);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionWords = countWords(section.content);

    if (sectionWords <= opts.maxWords) {
      if (sectionWords >= opts.minWords) {
        const chunkContent = buildChunkContent(documentTitle, section.heading, section.content);
        chunks.push({
          index: chunkIndex++,
          content: chunkContent,
          wordCount: countWords(chunkContent),
          tokenCount: estimateTokenCount(chunkContent),
          sectionHeading: section.heading,
        });
      } else {
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const mergedContent = lastChunk.content + '\n\n' + section.content;
          const mergedWords = countWords(mergedContent);
          if (mergedWords <= opts.maxWords) {
            lastChunk.content = mergedContent;
            lastChunk.wordCount = mergedWords;
            lastChunk.tokenCount = estimateTokenCount(mergedContent);
            continue;
          }
        }
        const chunkContent = buildChunkContent(documentTitle, section.heading, section.content);
        chunks.push({
          index: chunkIndex++,
          content: chunkContent,
          wordCount: countWords(chunkContent),
          tokenCount: estimateTokenCount(chunkContent),
          sectionHeading: section.heading,
        });
      }
    } else {
      const subChunks = splitSectionIntoParagraphChunks(
        section.content,
        documentTitle,
        section.heading,
        opts
      );
      for (const subChunk of subChunks) {
        chunks.push({ ...subChunk, index: chunkIndex++ });
      }
    }
  }

  return applyOverlap(chunks, opts.overlapWords);
}

function splitIntoSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text) {
          sections.push({ heading: currentHeading, content: text, level: currentLevel });
        }
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    const text = currentContent.join('\n').trim();
    if (text) {
      sections.push({ heading: currentHeading, content: text, level: currentLevel });
    }
  }

  if (sections.length === 0 && content.trim()) {
    sections.push({ heading: '', content: content.trim(), level: 0 });
  }

  return sections;
}

function splitSectionIntoParagraphChunks(
  content: string,
  documentTitle: string,
  sectionHeading: string,
  opts: Required<ChunkOptions>
): Omit<Chunk, 'index'>[] {
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
  const chunks: Omit<Chunk, 'index'>[] = [];
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);

    if (currentWordCount + paragraphWords > opts.maxWords && currentParagraphs.length > 0) {
      const text = currentParagraphs.join('\n\n');
      const chunkContent = buildChunkContent(documentTitle, sectionHeading, text);
      chunks.push({
        content: chunkContent,
        wordCount: countWords(chunkContent),
        tokenCount: estimateTokenCount(chunkContent),
        sectionHeading,
      });
      currentParagraphs = [];
      currentWordCount = 0;
    }

    currentParagraphs.push(paragraph);
    currentWordCount += paragraphWords;

    if (currentWordCount > opts.maxWords) {
      const text = currentParagraphs.join('\n\n');
      const chunkContent = buildChunkContent(documentTitle, sectionHeading, text);
      chunks.push({
        content: chunkContent,
        wordCount: countWords(chunkContent),
        tokenCount: estimateTokenCount(chunkContent),
        sectionHeading,
      });
      currentParagraphs = [];
      currentWordCount = 0;
    }
  }

  if (currentParagraphs.length > 0) {
    const text = currentParagraphs.join('\n\n');
    const chunkContent = buildChunkContent(documentTitle, sectionHeading, text);
    chunks.push({
      content: chunkContent,
      wordCount: countWords(chunkContent),
      tokenCount: estimateTokenCount(chunkContent),
      sectionHeading,
    });
  }

  return chunks;
}

function applyOverlap(chunks: Chunk[], overlapWords: number): Chunk[] {
  if (chunks.length <= 1 || overlapWords <= 0) return chunks;

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const prevWords = prevChunk.content.split(/\s+/);

    if (prevWords.length > overlapWords) {
      const overlapText = prevWords.slice(-overlapWords).join(' ');
      const newContent = `[...] ${overlapText}\n\n${chunks[i].content}`;
      chunks[i] = {
        ...chunks[i],
        content: newContent,
        wordCount: countWords(newContent),
        tokenCount: estimateTokenCount(newContent),
      };
    }
  }

  return chunks;
}

function buildChunkContent(documentTitle: string, sectionHeading: string, content: string): string {
  const parts: string[] = [];
  if (documentTitle) parts.push(`# ${documentTitle}`);
  if (sectionHeading) parts.push(`## ${sectionHeading}`);
  parts.push(content);
  return parts.join('\n\n');
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Clean raw PDF text extracted by pdf-parse:
 * - Fix common Unicode ligatures (ﬁ, ﬂ, etc.)
 * - Rejoin hyphenated line-breaks (e.g. "infor-\nmation" → "information")
 * - Strip bare page numbers (lines that are only digits)
 * - Detect and remove running headers/footers (lines repeated 5+ times)
 * - Normalize whitespace / excessive blank lines
 */
function cleanPdfText(raw: string): string {
  // Fix Unicode ligatures
  let text = raw
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/ﬅ/g, 'st')
    .replace(/ﬆ/g, 'st');

  // Rejoin hyphenated line-breaks
  text = text.replace(/(\w)-\n(\w)/g, '$1$2');

  // Strip lines that are only page numbers (pure digits, optional whitespace)
  text = text.replace(/^\s*\d+\s*$/gm, '');

  // Detect running headers/footers: lines repeated 5+ times → remove all occurrences
  const lines = text.split('\n');
  const lineFrequency = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 120) {
      lineFrequency.set(trimmed, (lineFrequency.get(trimmed) ?? 0) + 1);
    }
  }
  const repeatedLines = new Set<string>();
  for (const [line, count] of lineFrequency) {
    if (count >= 5) repeatedLines.add(line);
  }
  if (repeatedLines.size > 0) {
    text = lines
      .filter((line) => !repeatedLines.has(line.trim()))
      .join('\n');
  }

  // Normalize excessive blank lines (3+ → 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Chunk plain text extracted from a PDF.
 * Splits on double-newlines (paragraph boundaries), bypasses heading-based sectioning,
 * then passes through buildChunkContent + applyOverlap.
 */
export function chunkPdfText(
  text: string,
  documentTitle: string,
  options?: ChunkOptions
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cleaned = cleanPdfText(text);
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim());

  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;

  const flushChunk = () => {
    if (currentParagraphs.length === 0) return;
    const paragraphText = currentParagraphs.join('\n\n');
    const chunkContent = buildChunkContent(documentTitle, '', paragraphText);
    chunks.push({
      index: chunkIndex++,
      content: chunkContent,
      wordCount: countWords(chunkContent),
      tokenCount: estimateTokenCount(chunkContent),
      sectionHeading: '',
    });
    currentParagraphs = [];
    currentWordCount = 0;
  };

  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);

    if (currentWordCount + paragraphWords > opts.maxWords && currentParagraphs.length > 0) {
      flushChunk();
    }

    currentParagraphs.push(paragraph);
    currentWordCount += paragraphWords;

    if (currentWordCount >= opts.targetWords) {
      flushChunk();
    }
  }

  flushChunk();

  return applyOverlap(chunks, opts.overlapWords);
}
