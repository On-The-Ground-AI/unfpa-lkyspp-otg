"use client";

import { useState } from "react";

const UNFPA_BLUE = "#009EDB";
const UNFPA_DARK = "#005F8E";

// ── Shared phone chrome ────────────────────────────────────────────────────

function PhoneFrame({ children, label, id }: { children: React.ReactNode; label: string; id: string }) {
  return (
    <div className="flex flex-col items-center gap-3" id={id}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
      {/* Outer shell */}
      <div
        className="relative flex-shrink-0 rounded-[3rem] shadow-2xl overflow-hidden"
        style={{
          width: 390,
          height: 844,
          background: "#1a1a1a",
          boxShadow: "0 0 0 10px #1a1a1a, 0 0 0 12px #333, 0 30px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Punch-hole camera */}
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full"
          style={{ width: 12, height: 12, background: "#1a1a1a" }}
        />
        {/* Status bar */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-1"
          style={{ height: 44, background: "transparent" }}
        >
          <span className="text-white text-xs font-semibold" style={{ fontSize: 11 }}>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
              <rect x="0" y="3" width="3" height="9" rx="0.5" opacity="0.4"/>
              <rect x="4" y="2" width="3" height="10" rx="0.5" opacity="0.6"/>
              <rect x="8" y="0" width="3" height="12" rx="0.5" opacity="0.8"/>
              <rect x="12" y="0" width="3" height="12" rx="0.5"/>
            </svg>
            <svg width="16" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M1.5 8.5C5.4 4.6 10.4 2.5 12 2.5s6.6 2.1 10.5 6" opacity="0.3" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M4.5 11.5C7.4 8.6 9.9 7 12 7s4.6 1.6 7.5 4.5" opacity="0.6" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M7.5 14.5C9.3 12.7 10.7 12 12 12s2.7.7 4.5 2.5" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="17" r="1.5" fill="white"/>
            </svg>
            <div className="flex items-center gap-0.5">
              <div className="rounded-sm overflow-hidden border border-white/40" style={{ width: 22, height: 11 }}>
                <div className="h-full rounded-sm" style={{ width: "72%", background: "#4CAF50" }}/>
              </div>
              <div className="rounded-sm" style={{ width: 2, height: 5, background: "white", opacity: 0.4 }}/>
            </div>
          </div>
        </div>
        {/* Screen content */}
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "3rem" }}>
          {children}
        </div>
        {/* Home indicator */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full z-20"
          style={{ width: 120, height: 5, background: "white", opacity: 0.3 }}
        />
      </div>
    </div>
  );
}

// ── Screen 1: Welcome ──────────────────────────────────────────────────────

function WelcomeScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: `linear-gradient(160deg, ${UNFPA_DARK} 0%, ${UNFPA_BLUE} 60%, #00BCD4 100%)` }}>
      <div className="flex flex-col items-center gap-6 px-10 text-white text-center mt-8">
        {/* UN logo placeholder */}
        <div className="rounded-full bg-white/20 flex items-center justify-center"
          style={{ width: 96, height: 96, backdropFilter: "blur(8px)" }}>
          <span className="text-3xl font-bold text-white">UN</span>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-white/70 mb-2">UNFPA ON-THE-GROUND</p>
          <h1 className="text-3xl font-bold leading-tight mb-3">Clinical Knowledge Assistant</h1>
          <p className="text-sm text-white/80 leading-relaxed">
            Evidence-based clinical guidance for SRHR, safe motherhood, and essential medicines — available offline, anywhere.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full mt-4">
          <div className="rounded-2xl py-4 flex items-center justify-center font-semibold text-sm"
            style={{ background: "white", color: UNFPA_BLUE }}>
            Get Started
          </div>
          <div className="rounded-2xl py-3.5 flex items-center justify-center font-medium text-sm border border-white/30 text-white">
            I already have an account
          </div>
        </div>
        <p className="text-xs text-white/50 mt-2">UNFPA Asia-Pacific · LKYSPP Policy Innovation</p>
      </div>
    </div>
  );
}

// ── Screen 2: Mode Select ──────────────────────────────────────────────────

function ModeSelectScreen() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-semibold text-slate-400 tracking-widest mb-1">STEP 1 OF 3</p>
        <h2 className="text-2xl font-bold text-slate-900">How will you use the app?</h2>
        <p className="text-sm text-slate-500 mt-1">Choose your primary role. You can change this later in Settings.</p>
      </div>
      <div className="flex-1 px-6 flex flex-col gap-4 pt-2">
        {[
          {
            icon: "🩺", title: "Clinical Reference",
            desc: "Drug dosing, treatment protocols, SRHR guidelines, maternal health. For trained healthcare workers.",
            selected: true,
          },
          {
            icon: "🤝", title: "Partnership & Funding",
            desc: "Prepare briefings, match programmes to partner interests, draft funding proposals.",
            selected: false,
          },
          {
            icon: "📚", title: "Knowledge Explorer",
            desc: "Browse and search the full UNFPA knowledge base for research and policy work.",
            selected: false,
          },
        ].map((m) => (
          <div key={m.title}
            className="rounded-2xl p-4 border-2 flex gap-4 items-start"
            style={{
              background: m.selected ? `${UNFPA_BLUE}12` : "white",
              borderColor: m.selected ? UNFPA_BLUE : "#E2E8F0",
            }}>
            <div className="text-3xl mt-0.5">{m.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">{m.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
            </div>
            <div className="rounded-full border-2 mt-1 flex items-center justify-center flex-shrink-0"
              style={{
                width: 20, height: 20,
                borderColor: m.selected ? UNFPA_BLUE : "#CBD5E1",
                background: m.selected ? UNFPA_BLUE : "transparent",
              }}>
              {m.selected && <div className="rounded-full bg-white" style={{ width: 6, height: 6 }}/>}
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 pb-12 pt-4">
        <div className="rounded-2xl py-4 flex items-center justify-center font-semibold text-sm text-white"
          style={{ background: UNFPA_BLUE }}>
          Continue
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Chat ─────────────────────────────────────────────────────────

function ChatScreen() {
  const messages = [
    {
      role: "user",
      text: "What is the recommended oxytocin protocol for active management of third stage of labour?",
    },
    {
      role: "assistant",
      text: "**Active Management of Third Stage of Labour (AMTSL)**\n\nWHO and UNFPA recommend the following oxytocin protocol:\n\n**Preferred:** Oxytocin 10 IU IM immediately after birth of baby\n\n**If oxytocin unavailable:** Misoprostol 600 mcg orally\n\n**Key steps in AMTSL:**\n1. Administer uterotonic within 1 min of birth\n2. Controlled cord traction (Brandt-Andrews)\n3. Uterine massage after placenta delivery\n\nThis reduces PPH risk by 60% compared to expectant management.",
      sources: ["UNFPA Obstetric Emergencies Guide", "WHO AMTSL Guidelines 2023"],
    },
    { role: "user", text: "What if the patient has hypertension?" },
    {
      role: "assistant",
      text: "For patients with **hypertension or pre-eclampsia**, avoid ergometrine (causes vasoconstriction).\n\n✅ **Safe choice:** Oxytocin 10 IU IM remains first-line\n⚠️ **Avoid:** Ergometrine / Syntometrine\n\nIf IV access is available: Oxytocin infusion 20–40 IU in 500 mL NS at 125 mL/hr post-delivery.",
      sources: ["UNFPA Clinical Protocols v4.2"],
    },
  ];

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ width: 32, height: 32, background: UNFPA_BLUE }}>OTG</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Clinical Reference</p>
            <p className="text-xs text-green-500 font-medium">● Offline · Myanmar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs">⚙</div>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="rounded-full flex-shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs"
                style={{ width: 24, height: 24, background: UNFPA_BLUE, fontSize: 10 }}>AI</div>
            )}
            <div className="max-w-[75%]">
              <div className="rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
                style={{
                  background: m.role === "user" ? UNFPA_BLUE : "white",
                  color: m.role === "user" ? "white" : "#1e293b",
                  borderRadius: m.role === "user" ? "1.25rem 1.25rem 0.25rem 1.25rem" : "1.25rem 1.25rem 1.25rem 0.25rem",
                  boxShadow: m.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
                }}>
                {m.text.split("\n").map((line, j) => (
                  <p key={j} className={line.startsWith("**") ? "font-semibold" : ""}>
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))}
              </div>
              {m.sources && (
                <div className="flex flex-wrap gap-1 mt-1.5 ml-1">
                  {m.sources.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full border text-slate-500"
                      style={{ borderColor: "#E2E8F0", fontSize: 9, background: "white" }}>📎 {s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Input bar */}
      <div className="bg-white border-t border-slate-100 px-4 pt-2 pb-10">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5"
          style={{ background: "#F8FAFC" }}>
          <span className="flex-1 text-xs text-slate-400">Ask a clinical question…</span>
          <div className="rounded-full flex items-center justify-center text-white text-xs"
            style={{ width: 28, height: 28, background: UNFPA_BLUE }}>↑</div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 4: Dose Card ────────────────────────────────────────────────────

function DoseCardScreen() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <span className="text-slate-400 text-lg">←</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Drug Reference</p>
          <p className="text-xs text-slate-400">WHO Essential Medicines · UNFPA Formulary</p>
        </div>
      </div>
      {/* Search bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-slate-400 text-sm">🔍</span>
          <span className="text-xs text-slate-400">Search drugs…</span>
        </div>
      </div>
      {/* Dose card */}
      <div className="px-4 flex flex-col gap-3 overflow-auto pb-10">
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: `${UNFPA_BLUE}18` }}>
            <div>
              <p className="font-bold text-slate-900">Oxytocin</p>
              <p className="text-xs text-slate-500">Uterotonic · WHO EML</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-semibold text-white"
              style={{ background: UNFPA_BLUE }}>First-line</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {[
              { label: "PPH Prevention", dose: "10 IU IM · single dose", timing: "Within 1 min of birth" },
              { label: "PPH Treatment", dose: "20–40 IU in 500 mL NS · IV infusion", timing: "125 mL/hr; adjust to response" },
              { label: "Labour Augmentation", dose: "0.5–2 mIU/min · IV, titrate", timing: "Increase by 1–2 mIU/min q30min" },
            ].map((d) => (
              <div key={d.label} className="rounded-xl p-3 border border-slate-100" style={{ background: "#FAFBFC" }}>
                <p className="text-xs font-semibold text-slate-700 mb-1">{d.label}</p>
                <p className="text-xs font-mono text-slate-900">{d.dose}</p>
                <p className="text-xs text-slate-500 mt-0.5">⏱ {d.timing}</p>
              </div>
            ))}
            <div className="rounded-xl p-3 border border-amber-100 bg-amber-50">
              <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Contraindications</p>
              <p className="text-xs text-amber-700">Hypersensitivity · Cephalopelvic disproportion · Avoid ergometrine if hypertensive</p>
            </div>
            <p className="text-xs text-slate-400 text-right">Source: UNFPA Formulary v4.2 · WHO EML 23rd Edition</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: "#F0FDF4" }}>
            <div>
              <p className="font-bold text-slate-900">Misoprostol</p>
              <p className="text-xs text-slate-500">Prostaglandin · WHO EML</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: "#D1FAE5", color: "#065F46" }}>Alternative</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 5: Knowledge Base Browser ──────────────────────────────────────

function KBBrowserScreen() {
  const docs = [
    { title: "UNFPA Obstetric Emergencies Guidelines", tag: "Safe Motherhood", pages: 142, updated: "Mar 2026" },
    { title: "WHO SRHR Essential Package", tag: "SRHR", pages: 89, updated: "Jan 2026" },
    { title: "Myanmar Country Clinical Protocols", tag: "Country", pages: 54, updated: "Feb 2026" },
    { title: "Emergency Contraception Reference", tag: "Family Planning", pages: 38, updated: "Dec 2025" },
    { title: "Adolescent Health & Development Guide", tag: "Adolescents", pages: 76, updated: "Nov 2025" },
    { title: "Formulary — 32 Essential Medicines", tag: "Formulary", pages: 96, updated: "Mar 2026" },
  ];
  const tagColors: Record<string, string> = {
    "Safe Motherhood": "#FEE2E2", "SRHR": "#E0F2FE", Country: "#F0FDF4",
    "Family Planning": "#FDF4FF", Adolescents: "#FFFBEB", Formulary: `${UNFPA_BLUE}18`,
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Knowledge Base</p>
        <p className="text-xs text-slate-400">Downloaded · 6 collections · Last synced today</p>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-slate-400 text-sm">🔍</span>
          <span className="text-xs text-slate-400">Search clinical documents…</span>
        </div>
      </div>
      <div className="flex-1 px-4 flex flex-col gap-2.5 overflow-auto pb-12">
        {docs.map((d) => (
          <div key={d.title} className="bg-white rounded-2xl px-4 py-3.5 border border-slate-100 flex items-center gap-3 shadow-sm">
            <div className="rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{ width: 40, height: 40, background: tagColors[d.tag] || "#F1F5F9" }}>📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 leading-snug">{d.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: tagColors[d.tag] || "#F1F5F9", color: "#374151", fontSize: 9 }}>{d.tag}</span>
                <span className="text-xs text-slate-400" style={{ fontSize: 9 }}>{d.pages} pages · {d.updated}</span>
              </div>
            </div>
            <span className="text-slate-300 text-sm">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Screen 6: Offline / Country Select ────────────────────────────────────

function CountryScreen() {
  const countries = [
    { name: "Myanmar", flag: "🇲🇲", status: "Downloaded", color: "#D1FAE5" },
    { name: "Bangladesh", flag: "🇧🇩", status: "Downloaded", color: "#D1FAE5" },
    { name: "Cambodia", flag: "🇰🇭", status: "Available", color: "#E0F2FE" },
    { name: "Pakistan", flag: "🇵🇰", status: "Available", color: "#E0F2FE" },
    { name: "Nepal", flag: "🇳🇵", status: "Available", color: "#E0F2FE" },
    { name: "Timor-Leste", flag: "🇹🇱", status: "Available", color: "#E0F2FE" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-semibold text-slate-400 tracking-widest mb-1">STEP 2 OF 3</p>
        <h2 className="text-2xl font-bold text-slate-900">Select your country</h2>
        <p className="text-sm text-slate-500 mt-1">Country-specific protocols and local clinical guidelines will be prioritised.</p>
      </div>
      <div className="flex-1 px-4 flex flex-col gap-2.5 overflow-auto">
        {countries.map((c) => (
          <div key={c.name}
            className="bg-white rounded-2xl px-4 py-3.5 border-2 flex items-center gap-4 shadow-sm"
            style={{ borderColor: c.name === "Myanmar" ? UNFPA_BLUE : "#E2E8F0" }}>
            <span className="text-2xl">{c.flag}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: c.color, color: "#374151", fontSize: 9 }}>{c.status}</span>
            </div>
            {c.name === "Myanmar" && (
              <div className="rounded-full flex items-center justify-center"
                style={{ width: 20, height: 20, background: UNFPA_BLUE }}>
                <div className="rounded-full bg-white" style={{ width: 6, height: 6 }}/>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-6 pb-12 pt-4">
        <div className="rounded-2xl py-4 flex items-center justify-center font-semibold text-sm text-white"
          style={{ background: UNFPA_BLUE }}>
          Continue
        </div>
      </div>
    </div>
  );
}

// ── Screen 7: Settings ────────────────────────────────────────────────────

function SettingsScreen() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#F6F8FB", paddingTop: 44 }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <span className="text-slate-400 text-lg">←</span>
        <p className="text-sm font-semibold text-slate-900">Settings</p>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-auto pb-12">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="rounded-full flex items-center justify-center text-white font-bold"
            style={{ width: 48, height: 48, background: UNFPA_BLUE }}>HW</div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Healthcare Worker</p>
            <p className="text-xs text-slate-500">Clinical Reference Mode · Myanmar</p>
          </div>
        </div>
        {/* Sections */}
        {[
          {
            title: "App Mode",
            items: [
              { label: "Current mode", value: "Clinical Reference", action: "Change" },
              { label: "Country / Context", value: "Myanmar", action: "Change" },
              { label: "Language", value: "English", action: "Change" },
            ],
          },
          {
            title: "Offline Model",
            items: [
              { label: "Gemma 4 E2B (int4)", value: "Downloaded · 1.4 GB", action: "Update" },
              { label: "Embedding model", value: "MiniLM-L12 · 480 MB", action: null },
              { label: "Knowledge bundle", value: "v2.3 · 54 MB · Today", action: "Sync" },
            ],
          },
          {
            title: "Privacy & Audit",
            items: [
              { label: "Session logging", value: "On-device only", action: null },
              { label: "Export audit log", value: "", action: "Export" },
              { label: "Clear history", value: "", action: "Clear" },
            ],
          },
        ].map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <p className="text-xs font-semibold text-slate-500 px-4 pt-3 pb-2 uppercase tracking-widest">{section.title}</p>
            {section.items.map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${i < section.items.length - 1 ? "border-b border-slate-50" : ""}`}>
                <div>
                  <p className="text-xs font-medium text-slate-900">{item.label}</p>
                  {item.value && <p className="text-xs text-slate-400 mt-0.5">{item.value}</p>}
                </div>
                {item.action && (
                  <span className="text-xs font-semibold" style={{ color: UNFPA_BLUE }}>{item.action}</span>
                )}
              </div>
            ))}
          </div>
        ))}
        <p className="text-xs text-center text-slate-400 pb-4">
          UNFPA OTG v1.0.0 · Build 1<br/>Built by On The Ground / LKYSPP
        </p>
      </div>
    </div>
  );
}

// ── Main gallery page ──────────────────────────────────────────────────────

const SCREENS = [
  { id: "welcome", label: "1. Welcome", component: <WelcomeScreen /> },
  { id: "mode", label: "2. Mode Select", component: <ModeSelectScreen /> },
  { id: "country", label: "3. Country Select", component: <CountryScreen /> },
  { id: "chat", label: "4. Chat", component: <ChatScreen /> },
  { id: "dose", label: "5. Drug & Dose Card", component: <DoseCardScreen /> },
  { id: "kb", label: "6. Knowledge Base", component: <KBBrowserScreen /> },
  { id: "settings", label: "7. Settings", component: <SettingsScreen /> },
];

export default function MockupPage() {
  const [focus, setFocus] = useState<string | null>(null);

  const focused = SCREENS.find((s) => s.id === focus);

  return (
    <div className="min-h-screen" style={{ background: "#F0F4F8" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {focus && (
              <button onClick={() => setFocus(null)}
                className="text-sm text-slate-500 hover:text-slate-900 mr-2">← All screens</button>
            )}
            <span className="font-semibold text-slate-900 text-sm">
              UNFPA OTG — Android Mockup
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Play Store Screenshots</span>
          </div>
          <p className="text-xs text-slate-400">390×844 · iPhone 14 / Pixel 7 equivalent</p>
        </div>
      </div>

      {focus ? (
        /* ── Single screen focused view ── */
        <div className="flex flex-col items-center py-12 px-4">
          <p className="text-sm text-slate-500 mb-8">
            Right-click the phone → <strong>Inspect</strong> → set viewport to <strong>390×844</strong> and screenshot, or use your OS screenshot tool.
          </p>
          <PhoneFrame label={focused!.label} id={focused!.id}>
            {focused!.component}
          </PhoneFrame>
          <div className="flex gap-3 mt-8">
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => setFocus(s.id)}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  background: s.id === focus ? UNFPA_BLUE : "white",
                  color: s.id === focus ? "white" : "#64748b",
                  borderColor: s.id === focus ? UNFPA_BLUE : "#E2E8F0",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Gallery view ── */
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Android App Screens</h1>
            <p className="text-sm text-slate-500">
              Click any screen to focus it for screenshotting. Google Play requires at least 2 phone screenshots (1080×1920 recommended).
            </p>
          </div>
          <div className="flex flex-wrap gap-10 justify-start">
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => setFocus(s.id)}
                className="flex flex-col items-center gap-3 group cursor-pointer">
                <div className="transition-transform group-hover:scale-[1.02] group-hover:shadow-2xl"
                  style={{ transform: "scale(0.5)", transformOrigin: "top center", marginBottom: -422, marginRight: -195, marginLeft: -195 }}>
                  <PhoneFrame label="" id={`gallery-${s.id}`}>
                    {s.component}
                  </PhoneFrame>
                </div>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors mt-1">
                  {s.label}
                </span>
                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity -mt-2">
                  Click to focus →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
