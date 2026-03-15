"use client";

/**
 * ExpandableChat — reusable chat window component
 *
 * Features:
 * - Smooth horizontal expansion when conversation starts
 * - Starter prompts populate the input for editing (not auto-submit)
 * - Animated keyword loading indicator
 * - Server-enforced daily query limit (via /api/quota + /api/chat returning `remaining`)
 * - Timing note shown during loading
 *
 * To adapt for a new project:
 * 1. Replace STARTER_PROMPTS with your own
 * 2. Replace LOADING_WORDS with domain-relevant terms
 * 3. Set DAILY_LIMIT to match your server-side limit
 * 4. Point the fetch calls at your own /api/chat and /api/quota endpoints
 * 5. Your /api/chat should return { response, remaining } in its JSON
 * 6. Your /api/quota should return { remaining, limit }
 */

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; href: string }>;
}

interface StarterPrompt {
  label: string;
  icon: string;
  prompt: string;
}

interface ExpandableChatProps {
  /** Displayed in the chat header */
  title?: string;
  /** Subtitle shown below the title */
  subtitle?: string;
  /** Header background colour (hex or CSS value) */
  headerColor?: string;
  /** Send button / accent colour */
  accentColor?: string;
  /** Starter prompt cards shown on the empty state */
  starterPrompts?: StarterPrompt[];
  /** Words that cycle during loading */
  loadingWords?: string[];
  /** Daily query limit displayed in the footer */
  dailyLimit?: number;
  /** API endpoint for chat */
  chatEndpoint?: string;
  /** API endpoint for quota (GET, returns { remaining, limit }) */
  quotaEndpoint?: string;
}

// ── Defaults (swap these out per project) ───────────────────────────────────

const DEFAULT_STARTER_PROMPTS: StarterPrompt[] = [
  {
    label: "Ask a research question",
    icon: "🔍",
    prompt: "What are the key findings on this topic?",
  },
  {
    label: "Summarise an issue",
    icon: "📋",
    prompt: "Summarise the main evidence and debates on this issue.",
  },
  {
    label: "Draft meeting notes",
    icon: "📝",
    prompt: "Draft discussion questions and talking points for a stakeholder meeting.",
  },
  {
    label: "Generate a briefing",
    icon: "📄",
    prompt: "Write a one-page briefing suitable for a senior decision-maker.",
  },
  {
    label: "Compare options",
    icon: "⚖️",
    prompt: "Compare the main approaches and their trade-offs.",
  },
  {
    label: "Explore the evidence",
    icon: "📚",
    prompt: "What does the evidence say, and where is it strong or weak?",
  },
];

const DEFAULT_LOADING_WORDS = [
  "policy", "evidence", "research", "analysis", "strategy",
  "frameworks", "data", "stakeholders", "impact", "governance",
  "partnerships", "recommendations", "planning", "context", "review",
];

// ── Loading animation ─────────────────────────────────────────────────────

function LoadingPulse({ words, accentColor }: { words: string[]; accentColor: string }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % words.length);
        setVisible(true);
      }, 200);
    }, 1200);
    return () => clearInterval(cycle);
  }, [words]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg">
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span
        className="text-xs font-medium transition-opacity duration-200"
        style={{ color: accentColor, opacity: visible ? 1 : 0 }}
      >
        {words[idx]}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function ExpandableChat({
  title = "Knowledge Assistant",
  subtitle = "Grounded in the knowledge base",
  headerColor = "#003366",
  accentColor = "#009EDB",
  starterPrompts = DEFAULT_STARTER_PROMPTS,
  loadingWords = DEFAULT_LOADING_WORDS,
  dailyLimit = 20,
  chatEndpoint = "/api/chat",
  quotaEndpoint = "/api/quota",
}: ExpandableChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(dailyLimit);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasConversation = messages.length > 0;
  const isAtLimit = remaining <= 0;

  // Fetch server-side quota on mount
  useEffect(() => {
    fetch(quotaEndpoint)
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining ?? dailyLimit))
      .catch(() => {});
  }, [quotaEndpoint, dailyLimit]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const userMessage = (text ?? input).trim();
    if (!userMessage || isLoading || isAtLimit) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (typeof data.remaining === "number") setRemaining(data.remaining);

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            sources: data.sources?.length ? data.sources : undefined,
          },
        ]);
      } else if (res.status === 429) {
        setRemaining(0);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || `Daily limit of ${dailyLimit} queries reached. Resets at midnight UTC.` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Something went wrong. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not reach the server. Check your connection and try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Populate input from starter prompt without auto-submitting
  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 0);
  };

  return (
    // Expands horizontally to fill viewport width when conversation starts
    <div
      className="transition-all duration-700 ease-in-out"
      style={
        hasConversation
          ? { margin: "0 calc(-1 * max(0px, (100vw - 900px) / 2 - 2rem))" }
          : {}
      }
    >
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200" style={{ backgroundColor: headerColor }}>
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
            {subtitle}
          </p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
          {!hasConversation && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                What would you like to do?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {starterPrompts.map((p) => (
                  <button
                    key={p.prompt}
                    onClick={() => handleStarterClick(p.prompt)}
                    className="flex items-start gap-3 text-left px-4 py-3 border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors rounded-lg group"
                  >
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{p.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                        {p.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
                        {p.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, i) => (
            <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg ${
                  message.role === "user"
                    ? "px-4 py-3 text-white text-sm"
                    : "bg-white border border-slate-200 text-slate-900 px-4 py-3"
                }`}
                style={message.role === "user" ? { backgroundColor: headerColor } : {}}
              >
                {message.role === "assistant" ? (
                  <div className="prose max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Sources</p>
                    <ul className="space-y-1">
                      {message.sources.map((s, j) => (
                        <li key={j} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span
                            className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: accentColor }}
                          />
                          <a href={s.href} className="hover:underline hover:text-blue-600">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <LoadingPulse words={loadingWords} accentColor={accentColor} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {isAtLimit ? (
            <div className="text-center py-3 text-sm text-slate-500 bg-slate-50 rounded border border-slate-200">
              Daily limit of {dailyLimit} queries reached. Resets at midnight UTC.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question, request a briefing, draft meeting notes…"
                  className="flex-1 resize-none border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="px-4 text-white rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  Enter to send · Shift+Enter for new line
                </p>
                <p className="text-xs text-slate-400">
                  {isLoading
                    ? "⏳ This takes ~20–30 seconds"
                    : `${remaining} of ${dailyLimit} queries remaining today`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
