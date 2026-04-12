'use client';

/**
 * Drug Lookup Component
 *
 * Provides formulary search and structured drug information:
 * - Drug name, dose, route, indication
 * - Contraindications and warnings
 * - WHO EML status
 * - Links to source documentation
 *
 * Used in clinical chat to display verified drug information.
 */

import React, { useState, useCallback } from 'react';
import { Search, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import type { FormularyResult } from '@/services/clinicalRagService';

interface DrugLookupProps {
  drugs?: string[];
  onDrugSelect?: (drug: FormularyResult) => void;
  mode?: 'inline' | 'modal'; // inline: display in clinical chat, modal: dedicated search
}

export default function DrugLookup({ drugs, onDrugSelect, mode = 'inline' }: DrugLookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<FormularyResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDrug, setExpandedDrug] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/clinical/formulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm: query.trim() }),
        });

        if (!response.ok) throw new Error('Failed to search formulary');

        const data = await response.json();
        setResults(data.entries || []);

        if (data.entries.length === 0) {
          setError('Drug not found in formulary');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-load provided drugs
  React.useEffect(() => {
    if (drugs && drugs.length > 0) {
      handleSearch(drugs[0]);
    }
  }, [drugs, handleSearch]);

  const toggleExpanded = (drugName: string) => {
    setExpandedDrug(expandedDrug === drugName ? null : drugName);
  };

  const inlineContent = (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-3 text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search drug name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleSearch(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && <Loader2 size={18} className="absolute right-3 top-3 animate-spin text-gray-400" />}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((drug) => (
            <div
              key={drug.id}
              className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition"
            >
              {/* Drug Header */}
              <button
                onClick={() => toggleExpanded(drug.drug)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">{drug.drug}</h4>
                  <p className="text-sm text-gray-600">
                    {drug.dose} {drug.route}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {drug.whoEmlListed && (
                    <div title="WHO Essential Medicines List" className="cursor-help">
                      <CheckCircle2 size={18} className="text-green-600" />
                    </div>
                  )}
                  <span className={`transform transition ${expandedDrug === drug.drug ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedDrug === drug.drug && (
                <div className="p-4 border-t space-y-3">
                  {/* Indication */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">INDICATION</p>
                    <p className="text-sm text-gray-700">{drug.indication}</p>
                  </div>

                  {/* Contraindications */}
                  {drug.contraindications && drug.contraindications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1">CONTRAINDICATIONS</p>
                      <ul className="space-y-1">
                        {drug.contraindications.map((ci, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex gap-2">
                            <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                            {ci}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {drug.warnings && drug.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-1">WARNINGS</p>
                      <ul className="space-y-1">
                        {drug.warnings.map((w, idx) => (
                          <li key={idx} className="text-sm text-gray-700">
                            • {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Source */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">SOURCE</p>
                    <p className="text-sm text-gray-700">{drug.source}</p>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onDrugSelect?.(drug)}
                    className="w-full mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm"
                  >
                    Use in Answer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && searchTerm && !error && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">
            No formulary entries found for "{searchTerm}"
          </p>
          <p className="text-gray-500 text-xs mt-1">
            This drug may not be in the verified formulary database.
          </p>
        </div>
      )}
    </div>
  );

  return mode === 'inline' ? inlineContent : <div className="w-full">{inlineContent}</div>;
}
