'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, AlertCircle, Pill, ChevronDown, ChevronUp } from 'lucide-react';
import ClinicalCitationDrawer from '@/components/clinical-citation-drawer';
import DrugLookup from '@/components/drug-lookup';
import ClinicalEvidenceBadge from '@/components/clinical-evidence-badge';
import type { ClinicalChunkResult, FormularyResult } from '@/services/clinicalRagService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  citations?: ClinicalChunkResult[];
}

interface UIState {
  isLoading: boolean;
  statusMessage: string;
  country: string;
  specialization: string;
}

export default function ClinicalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<ClinicalChunkResult | null>(null);
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDrugLookup, setShowDrugLookup] = useState(false);
  const [uiState, setUiState] = useState<UIState>({
    isLoading: false,
    statusMessage: '',
    country: '',
    specialization: 'obstetrics',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCitationClick = (citation: ClinicalChunkResult) => {
    setSelectedCitation(citation);
    setCitationDrawerOpen(true);
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || uiState.isLoading) return;

    const userMessage: Message = { role: 'user', content: inputText };
    const assistantMessage: Message = { role: 'assistant', content: '', isStreaming: true, citations: [] };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputText('');
    setUiState((prev) => ({ ...prev, isLoading: true, statusMessage: 'Searching clinical knowledge base...' }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText,
          conversationHistory: messages,
          mode: 'clinical',
          country: uiState.country,
          language: 'en',
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');

        for (const line of lines) {
          if (!line.trim()) { currentEvent = ''; continue; }

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5));

              if (currentEvent === 'status' && data.message) {
                setUiState((prev) => ({ ...prev, statusMessage: data.message }));
              } else if (data.text) {
                accumulatedText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = accumulatedText;
                  return updated;
                });
              } else if (data.sources !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1].isStreaming = false;
                  updated[updated.length - 1].citations = data.sources ?? [];
                  return updated;
                });
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }

      setUiState((prev) => ({ ...prev, isLoading: false, statusMessage: '' }));
    } catch {
      setUiState((prev) => ({ ...prev, isLoading: false, statusMessage: '' }));
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Sorry, I encountered an error. Please try again.';
        updated[updated.length - 1].isStreaming = false;
        return updated;
      });
    }
  }, [inputText, messages, uiState.country, uiState.isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-white">
      {/* Header */}
      <div className="border-b flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clinical Reference</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {uiState.country ? `${uiState.country} · ` : ''}
              {uiState.specialization.charAt(0).toUpperCase() + uiState.specialization.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowDrugLookup((v) => !v); setShowSettings(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition font-medium ${showDrugLookup ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Pill size={15} />
              Drug Lookup
            </button>
            <button
              onClick={() => { setShowSettings((v) => !v); setShowDrugLookup(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${showSettings ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            >
              <Settings size={15} />
              {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country (Optional)</label>
                <input
                  type="text"
                  value={uiState.country}
                  onChange={(e) => setUiState((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g., Myanmar, Bangladesh"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinical Specialization</label>
                <select
                  value={uiState.specialization}
                  onChange={(e) => setUiState((prev) => ({ ...prev, specialization: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="obstetrics">Obstetrics</option>
                  <option value="neonatology">Neonatology</option>
                  <option value="family-planning">Family Planning</option>
                  <option value="emergency">Emergency / Trauma</option>
                  <option value="general">General Nursing</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Drug Lookup Panel */}
        {showDrugLookup && (
          <div className="border-t bg-blue-50 px-4 py-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-medium text-blue-700 mb-3">Search 59+ verified formulary entries</p>
              <DrugLookup mode="inline" />
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-start gap-2">
          <AlertCircle size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            <strong>Clinical Reference Tool:</strong> Evidence-based information from WHO guidelines. Always apply professional judgment and follow facility protocols.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Clinical Query Assistant</h2>
              <p className="text-gray-500 text-sm mb-6">Ask about protocols, dosing, contraindications, and guidelines.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  { title: 'Dosing', q: 'What is the dose of oxytocin for AMTSL?' },
                  { title: 'Protocols', q: 'What is the protocol for managing PPH?' },
                  { title: 'Contraindications', q: 'Who should not receive misoprostol?' },
                  { title: 'Guidelines', q: 'What is WHO guidance on magnesium sulphate?' },
                ].map(({ title, q }) => (
                  <button
                    key={title}
                    onClick={() => setInputText(q)}
                    className="p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-left"
                  >
                    <p className="font-semibold text-sm text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{q}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 border text-sm">
                        {msg.isStreaming && !msg.content ? (
                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          renderMessageWithCitations(msg.content, msg.citations ?? [], handleCitationClick)
                        )}
                      </div>

                      {/* Evidence badges */}
                      {!msg.isStreaming && msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {msg.citations.slice(0, 4).map((citation, i) => (
                            <button key={i} onClick={() => handleCitationClick(citation)} className="hover:opacity-80 transition-opacity">
                              <ClinicalEvidenceBadge
                                level={citation.evidenceLevel === 'guideline' ? 'guideline' : 'general'}
                                size="sm"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sources */}
                      {!msg.isStreaming && msg.citations && msg.citations.length > 0 && (
                        <details className="text-xs px-1">
                          <summary className="cursor-pointer font-medium text-gray-500 hover:text-gray-700 select-none">
                            {msg.citations.length} source{msg.citations.length !== 1 ? 's' : ''}
                          </summary>
                          <div className="mt-1.5 space-y-1">
                            {msg.citations.map((cite, i) => (
                              <button
                                key={i}
                                onClick={() => handleCitationClick(cite)}
                                className="block text-left w-full px-2 py-1.5 hover:bg-gray-100 rounded text-gray-600"
                              >
                                <strong>{cite.sourceDocument || cite.documentTitle}</strong>
                                {cite.sourceSection && ` — ${cite.sourceSection}`}
                                {cite.sourcePage && ` (p. ${cite.sourcePage})`}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {uiState.isLoading && uiState.statusMessage && (
                <div className="flex items-center gap-2 text-xs text-gray-400 pl-1">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  {uiState.statusMessage}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a clinical question..."
              disabled={uiState.isLoading}
              className="flex-1 px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            <button
              onClick={sendMessage}
              disabled={uiState.isLoading || !inputText.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center gap-1.5 text-sm font-medium"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <ClinicalCitationDrawer
        isOpen={citationDrawerOpen}
        citation={selectedCitation}
        onClose={() => setCitationDrawerOpen(false)}
      />
    </div>
  );
}

function renderMessageWithCitations(
  content: string,
  citations: ClinicalChunkResult[],
  onCitationClick: (citation: ClinicalChunkResult) => void
) {
  // Split on [SRC:...] tags and render each segment
  const parts = content.split(/(\[SRC:[^\]]+\])/g);

  return (
    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\[SRC:([^\]]+)\]$/);
        if (!match) return <span key={i}>{part}</span>;

        const chunkId = match[1];
        const citation = citations.find(
          (c) => c.chunkId === chunkId || c.chunkSlug === chunkId || c.id === chunkId
        );

        return (
          <button
            key={i}
            onClick={() => citation && onCitationClick(citation)}
            className={`inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded text-xs font-mono align-middle transition-colors ${
              citation
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                : 'bg-gray-100 text-gray-500 cursor-default'
            }`}
            title={citation ? `${citation.sourceDocument || citation.documentTitle}` : chunkId}
          >
            [{citation?.sourceDocument?.slice(0, 12) ?? chunkId.slice(0, 12)}]
          </button>
        );
      })}
    </div>
  );
}
