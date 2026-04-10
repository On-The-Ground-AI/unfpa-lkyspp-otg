'use client';

/**
 * Clinical Citation Drawer Component
 *
 * Displays clinical sources with full citation information:
 * - Source document title and edition
 * - Specific section and page number
 * - Link to source URL (if available)
 * - Evidence level and WHO EML status
 *
 * Opens from tapping [SRC:...] citation tags in clinical answers.
 */

import React from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ClinicalChunkResult } from '@/services/clinicalRagService';

interface ClinicalCitationDrawerProps {
  isOpen: boolean;
  citation: ClinicalChunkResult | null;
  onClose: () => void;
}

export default function ClinicalCitationDrawer({
  isOpen,
  citation,
  onClose,
}: ClinicalCitationDrawerProps) {
  if (!isOpen || !citation) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-2xl z-50 transform transition-transform duration-300 md:bottom-auto md:right-0 md:top-0 md:w-96 md:rounded-t-none md:rounded-l-lg md:h-screen ${
          isOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white md:rounded-t-lg">
          <h2 className="font-semibold text-lg">Source Citation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close citation drawer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-6 max-h-[calc(100vh-80px)]">
          {/* Document Information */}
          <section>
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Document</h3>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900">
                {citation.sourceDocument || citation.documentTitle}
              </p>
              {citation.sourceSection && (
                <p className="text-sm text-gray-700">
                  Section: <span className="font-medium">{citation.sourceSection}</span>
                </p>
              )}
              {citation.sourcePage && (
                <p className="text-sm text-gray-700">
                  Page: <span className="font-mono font-medium">{citation.sourcePage}</span>
                </p>
              )}
            </div>
          </section>

          {/* Evidence Level */}
          <section>
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Evidence Level</h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                <CheckCircle2 size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {citation.evidenceLevel === 'guideline'
                    ? 'Clinical Guideline'
                    : 'General Knowledge'}
                </span>
              </div>
            </div>
          </section>

          {/* Similarity Score */}
          <section>
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Relevance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Similarity Score</span>
                <span className="text-sm font-mono font-semibold text-gray-900">
                  {(citation.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${citation.similarity * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* Source URL */}
          {citation.sourceUrl && (
            <section>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">Verify Online</h3>
              <a
                href={citation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-medium text-sm"
              >
                <ExternalLink size={16} />
                Open Source Document
              </a>
            </section>
          )}

          {/* Chunk Preview */}
          <section>
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Content Preview</h3>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 line-clamp-6 whitespace-pre-wrap">
                {citation.chunkContent}
              </p>
              {citation.chunkContent.length > 300 && (
                <p className="text-xs text-gray-500 mt-2">
                  (Preview truncated. Consult full source for complete information.)
                </p>
              )}
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 mb-1">Important</p>
                <p className="text-xs text-amber-800">
                  Always verify clinical information with the source document and your
                  facility&apos;s protocols. This is a reference tool, not a substitute for
                  professional judgment.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
