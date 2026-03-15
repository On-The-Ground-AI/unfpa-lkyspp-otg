# ExpandableChat — Reusable Chat Window Component

A self-contained Next.js chat component with:
- Smooth horizontal expansion when a conversation starts
- Starter prompt cards that populate the input (not auto-submit)
- Animated keyword loading indicator
- Timing note during loading
- Server-enforced global daily query limit

---

## Files

| File | Purpose |
|---|---|
| `ExpandableChat.tsx` | The React component (copy into your project's `components/`) |

---

## Dependencies

```bash
npm install react-markdown @upstash/redis
```

Tailwind CSS must be configured in your project. The component uses standard Tailwind utilities and a `.prose` class for markdown rendering (add this to your `globals.css` — see below).

---

## Quick Start

### 1. Copy the component
```
components/ExpandableChat.tsx
```

### 2. Use it in a page
```tsx
import { ExpandableChat } from "@/components/ExpandableChat";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <ExpandableChat
        title="My Knowledge Assistant"
        subtitle="Grounded in the project knowledge base"
        headerColor="#003366"
        accentColor="#009EDB"
        starterPrompts={[
          { label: "Ask a question", icon: "🔍", prompt: "What are the key findings on X?" },
          { label: "Draft a briefing", icon: "📄", prompt: "Write a one-page briefing on Y." },
        ]}
        loadingWords={["policy", "evidence", "analysis", "strategy"]}
        dailyLimit={20}
      />
    </main>
  );
}
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | `"Knowledge Assistant"` | Header title |
| `subtitle` | string | `"Grounded in the knowledge base"` | Header subtitle |
| `headerColor` | string | `"#003366"` | Header background colour |
| `accentColor` | string | `"#009EDB"` | Send button and keyword colour |
| `starterPrompts` | `StarterPrompt[]` | 6 generic prompts | Cards shown on empty state |
| `loadingWords` | `string[]` | Generic policy terms | Words that cycle during loading |
| `dailyLimit` | number | `20` | Daily query limit (must match server) |
| `chatEndpoint` | string | `"/api/chat"` | API route for chat |
| `quotaEndpoint` | string | `"/api/quota"` | API route for quota check |

---

## Required API Routes

### `/api/chat` — POST

**Request body:**
```json
{ "message": "...", "conversationHistory": [...] }
```

**Response (success):**
```json
{ "response": "...", "sources": [...], "remaining": 14 }
```

**Response (rate limited):**
```json
{ "error": "Daily limit reached..." }
// HTTP 429
```

### `/api/quota` — GET

**Response:**
```json
{ "used": 6, "remaining": 14, "limit": 20 }
```

---

## Server-Side Global Rate Limiting (Upstash Redis)

The daily limit is enforced server-side using Upstash Redis, so it applies across **all users and all browser sessions** — not per-device.

### Setup (one-time)

1. Create a free database at [upstash.com](https://upstash.com)
2. Add these environment variables to your Vercel project:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
3. Copy the rate-limiting logic from `next-app/app/api/chat/route.ts` and `next-app/app/api/quota/route.ts` in the UNFPA project

If the env vars are not set, the limit is not enforced (safe fallback for local development).

---

## `.prose` CSS (add to `globals.css`)

The component uses `.prose` for markdown rendering. Add this to your project's `globals.css`:

```css
.prose { color: #1e293b; line-height: 1.75; font-size: 0.9375rem; }
.prose h1, .prose h2, .prose h3, .prose h4 { color: #0f172a; font-weight: 700; line-height: 1.3; margin-top: 2em; margin-bottom: 0.75em; }
.prose h2 { font-size: 1.2rem; padding-bottom: 0.4em; border-bottom: 1px solid #e2e8f0; }
.prose h3 { font-size: 1.05rem; }
.prose p { margin-bottom: 1em; }
.prose strong { font-weight: 600; color: #0f172a; }
.prose ul, .prose ol { margin: 0.75em 0 1em 0; padding-left: 1.5em; }
.prose li { margin-bottom: 0.35em; }
.prose ul > li { list-style-type: disc; }
.prose ol > li { list-style-type: decimal; }
.prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
.prose table { width: 100%; border-collapse: collapse; margin: 1.25em 0; font-size: 0.9em; }
.prose th, .prose td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; text-align: left; }
.prose th { font-weight: 600; background: #f1f5f9; }
.prose a { color: #0284c7; text-decoration: underline; }
```
