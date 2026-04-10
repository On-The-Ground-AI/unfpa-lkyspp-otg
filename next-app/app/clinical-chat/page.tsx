'use client';

/**
 * Clinical Chat Page
 *
 * Dedicated interface for clinical queries with:
 * - Clinical mode messaging with automatic knowledge base search
 * - Citation drawer for source documents
 * - Dose calculator and drug formulary integration
 * - Evidence badges showing guideline vs general knowledge
 * - Specialization context (obstetrics, neonatology, etc.)
 *
 * Uses existing chat infrastructure with clinical-specific enhancements.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Menu, X, AlertCircle, ExternalLink } from 'lucide-react';
import ClinicalCitationDrawer from '@/components/clinical-citation-drawer';
import DrugLookup from '@/components/drug-lookup';
import DoseCalculator from '@/components/dose-calculator';
import ClinicalEvidenceBadge from '@/components/clinical-evidence-badge';
import type { ClinicalChunkResult, FormularyResult } from '@/services/clinicalRagService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  citations?: ClinicalChunkResult[];
  doseCard?: { drug: string; dose: string; route: string };
}

interface UIState {
  isLoading: boolean;
  statusMessage: string;
  mode: string;
  country: string;
  specialization: string;
}

export default function ClinicalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<ClinicalChunkResult | null>(null);
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uiState, setUiState] = useState<UIState>({
    isLoading: false,
    statusMessage: '',
    mode: 'clinical',
    country: '',
    specialization: 'obstetrics',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCitationClick = (citation: ClinicalChunkResult) => {
    setSelectedCitation(citation);
    setCitationDrawerOpen(true);
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Create assistant message placeholder
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      citations: [],
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setUiState((prev) => ({ ...prev, isLoading: true, statusMessage: 'Searching clinical knowledge base...' }));

    try {
      // Stream response from /api/chat with clinical mode
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          if (!line.startsWith('event:') && !line.startsWith('data:')) continue;

          try {
            if (line.startsWith('event:')) {
              const eventType = line.slice(6).trim();
              // Handle status events
              if (eventType === 'status') {
                // Status will be in the next line
              }
            } else if (line.startsWith('data:')) {
              const data = JSON.parse(line.slice(5));

              if (data.text) {
                // Text delta
                accumulatedText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = accumulatedText;
                  return updated;
                });
              } else if (data.sources) {
                // Done event with sources
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1].isStreaming = false;
                  updated[updated.length - 1].citations = data.sources;
                  return updated;
                });
              }
            }
          } catch (e) {
            // Ignore JSON parse errors for malformed SSE
          }
        }
      }

      setUiState((prev) => ({ ...prev, isLoading: false, statusMessage: '' }));
    } catch (error) {
      console.error('Chat error:', error);
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        statusMessage: 'Error: Failed to get response',
      }));

      // Update last message with error
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content =
          'Sorry, I encountered an error processing your request. Please try again.';
        updated[updated.length - 1].isStreaming = false;
        return updated;
      });
    }
  }, [inputText, messages, uiState.country]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clinical Reference</h1>
            <p className="text-sm text-gray-600 mt-1">
              {uiState.country ? `${uiState.country} · ` : ''}
              {uiState.specialization.charAt(0).toUpperCase() + uiState.specialization.slice(1)}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t bg-gray-50 px-4 py-4">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country (Optional)
                </label>
                <input
                  type="text"
                  value={uiState.country}
                  onChange={(e) =>
                    setUiState((prev) => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="e.g., Myanmar, Bangladesh"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical Specialization
                </label>
                <select
                  value={uiState.specialization}
                  onChange={(e) =>
                    setUiState((prev) => ({ ...prev, specialization: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Clinical Reference Tool:</strong> This system provides evidence-based
            clinical information from WHO guidelines and verified formularies. Always apply
            professional judgment and follow your facility&apos;s protocols. Not a substitute
            for supervision or consultation.
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinical Query Assistant</h2>
              <p className="text-gray-600 mb-8">
                Ask about clinical protocols, drug dosing, contraindications, and more.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExampleCard
                  title="Dosing"
                  description="What is the dose of oxytocin for AMTSL?"
                  onClick={() => setInputText('What is the dose of oxytocin for AMTSL?')}
                />
                <ExampleCard
                  title="Protocols"
                  description="What is the protocol for managing PPH?"
                  onClick={() => setInputText('What is the protocol for managing PPH?')}
                />
                <ExampleCard
                  title="Contraindications"
                  description="Who should not receive misoprostol?"
                  onClick={() => setInputText('Who should not receive misoprostol?')}
                />
                <ExampleCard
                  title="Guidelines"
                  description="What is WHO guidance on magnesium sulphate?"
                  onClick={() => setInputText('What is WHO guidance on magnesium sulphate?')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end mb-4">
                      <div className="max-w-2xl bg-blue-600 text-white rounded-lg px-4 py-3">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border">
                        {/* Parse and render citations */}
                        {renderMessageWithCitations(msg.content, handleCitationClick)}
                      </div>

                      {/* Evidence badges */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.slice(0, 3).map((citation, i) => (
                            <button
                              key={i}
                              onClick={() => handleCitationClick(citation)}
                              className="text-xs hover:opacity-80"
                            >
                              <ClinicalEvidenceBadge
                                level={citation.evidenceLevel === 'guideline' ? 'guideline' : 'general'}
                                size="sm"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sources Section */}
                      {msg.citations && msg.citations.length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                            View {msg.citations.length} source(s)
                          </summary>
                          <div className="mt-2 space-y-2 text-gray-600">
                            {msg.citations.map((cite, i) => (
                              <button
                                key={i}
                                onClick={() => handleCitationClick(cite)}
                                className="block text-left p-2 hover:bg-gray-100 rounded w-full text-xs"
                              >
                                <strong>{cite.sourceDocument || cite.documentTitle}</strong>
                                {cite.sourceSection && ` - ${cite.sourceSection}`}
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

              {uiState.isLoading && (
                <div className="flex justify-start">
                  <div className="text-gray-600 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin">⚙️</div>
                      {uiState.statusMessage}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !uiState.isLoading && sendMessage()}
              placeholder="Ask a clinical question..."
              disabled={uiState.isLoading}
              className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            <button
              onClick={sendMessage}
              disabled={uiState.isLoading || !inputText.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium flex items-center gap-2"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Citation Drawer */}
      <ClinicalCitationDrawer
        isOpen={citationDrawerOpen}
        citation={selectedCitation}
        onClose={() => setCitationDrawerOpen(false)}
      />
    </div>
  );
}

function ExampleCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </button>
  );
}

function renderMessageWithCitations(
  content: string,
  onCitationClick: (citation: ClinicalChunkResult) => void
) {
  // Parse [SRC:...] citations and make them clickable
  // For now, return as plain text - full implementation would parse and link citations
  return <p className="whitespace-pre-wrap text-gray-900">{content}</p>;
}
