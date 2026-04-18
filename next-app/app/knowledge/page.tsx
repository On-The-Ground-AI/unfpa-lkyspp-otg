import Link from 'next/link';
import { getAllDocs, BLOCK_LABELS, type DocSummary } from '@/lib/docs';
import { getAllClinicalDocs, PUBLISHER_ORDER, type ClinicalDocSummary } from '@/lib/clinicalDocs';

export const metadata = {
  title: 'Knowledge Base — UNFPA Partnership Catalyst',
  description: 'Reference library covering UNFPA partnership development and clinical care for Asia-Pacific frontline health workers.',
};

type View = 'partnership' | 'clinical';

const FEATURED_PARTNERSHIP_CODE = 'UNFPA-R-05';
const BLOCK_ORDER = ['O', 'W', 'D', 'C', 'R'];

const BLOCK_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  O:     { bg: 'bg-blue-50',   text: 'text-blue-900',  border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-800' },
  W:     { bg: 'bg-green-50',  text: 'text-green-900', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
  D:     { bg: 'bg-purple-50', text: 'text-purple-900',border: 'border-purple-200',badge: 'bg-purple-100 text-purple-800' },
  C:     { bg: 'bg-amber-50',  text: 'text-amber-900', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  PMNCH: { bg: 'bg-teal-50',   text: 'text-teal-900',  border: 'border-teal-200',  badge: 'bg-teal-100 text-teal-800' },
  R:     { bg: 'bg-rose-50',  text: 'text-rose-900',  border: 'border-rose-200',  badge: 'bg-rose-100 text-rose-800' },
};

function DocCard({ doc }: { doc: DocSummary }) {
  const blockKey = doc.frontmatter.org === 'PMNCH' ? 'PMNCH' : doc.frontmatter.block;
  const colors = BLOCK_COLORS[blockKey] || BLOCK_COLORS['O'];

  return (
    <Link
      href={`/knowledge/${doc.slug}`}
      className={`block p-4 border ${colors.border} ${colors.bg} hover:shadow-md transition-shadow rounded-lg group`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${colors.badge} flex-shrink-0`}>
          {doc.frontmatter.code}
        </span>
        <span className="text-xs text-slate-400">{doc.wordCount.toLocaleString()} words</span>
      </div>
      <p className={`text-sm font-semibold leading-snug ${colors.text} group-hover:underline`}>
        {doc.frontmatter.title}
      </p>
      <div className="flex gap-2 mt-2 flex-wrap">
        {doc.frontmatter.tier && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {doc.frontmatter.tier}
          </span>
        )}
        {doc.frontmatter.audience && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {doc.frontmatter.audience}
          </span>
        )}
      </div>
    </Link>
  );
}

function FeaturedCard({ doc }: { doc: DocSummary }) {
  return (
    <Link
      href={`/knowledge/${doc.slug}`}
      className="block p-6 border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white hover:shadow-lg transition-shadow rounded-lg group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white">
            Featured
          </span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
            {doc.frontmatter.code}
          </span>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">{doc.wordCount.toLocaleString()} words</span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-rose-900 group-hover:underline mb-2">
        {doc.frontmatter.title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        A directory of 126 Singapore-based philanthropic organisations, family offices, and corporate foundations
        relevant to maternal, reproductive, and children&apos;s health — mapped across four tiers of partnership potential.
        Start here to orient any funder conversation.
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        {doc.frontmatter.tier && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {doc.frontmatter.tier}
          </span>
        )}
        {doc.frontmatter.audience && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {doc.frontmatter.audience}
          </span>
        )}
      </div>
    </Link>
  );
}

function ClinicalDocCard({ doc }: { doc: ClinicalDocSummary }) {
  const verified = doc.meta.clinicalStatus === 'VERIFIED';
  return (
    <div className="block p-4 border border-sky-200 bg-sky-50 rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 flex-shrink-0">
          {doc.meta.publisher === 'World Health Organization' ? 'WHO' : doc.meta.publisher}
          {doc.meta.publicationYear ? ` · ${doc.meta.publicationYear}` : ''}
        </span>
        <span className="text-xs text-slate-400">{doc.chunkCount} chunks</span>
      </div>
      <p className="text-sm font-semibold leading-snug text-sky-900">
        {doc.meta.sourceTitle}
      </p>
      {doc.meta.contentType && (
        <p className="text-xs text-slate-600 mt-1 leading-snug">{doc.meta.contentType}</p>
      )}
      <div className="flex gap-2 mt-2 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
          verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {verified ? 'Clinician-verified' : 'Unverified'}
        </span>
        {doc.meta.sourceEdition && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {doc.meta.sourceEdition}
          </span>
        )}
        {doc.meta.sourceUrl && (
          <a
            href={doc.meta.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline bg-white border border-slate-200 px-2 py-0.5 rounded"
          >
            Source ↗
          </a>
        )}
      </div>
      {doc.meta.sections && doc.meta.sections.length > 0 && (
        <ul className="mt-3 space-y-0.5">
          {doc.meta.sections.slice(0, 4).map((s) => (
            <li key={s} className="text-xs text-slate-500 flex gap-1.5">
              <span className="text-sky-400">·</span>
              <span>{s}</span>
            </li>
          ))}
          {doc.meta.sections.length > 4 && (
            <li className="text-xs text-slate-400">+ {doc.meta.sections.length - 4} more sections</li>
          )}
        </ul>
      )}
    </div>
  );
}

function TabNav({ view }: { view: View }) {
  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;
  return (
    <div className="border-b border-slate-200 mb-6 flex items-center gap-1">
      <Link href="/knowledge?view=partnership" className={tabClass(view === 'partnership')}>
        Partnership
      </Link>
      <Link href="/knowledge?view=clinical" className={tabClass(view === 'clinical')}>
        Clinical
      </Link>
    </div>
  );
}

function PartnershipView() {
  const docs = getAllDocs();
  const featured = docs.find((d) => d.frontmatter.code === FEATURED_PARTNERSHIP_CODE);
  const rest = docs.filter((d) => d.frontmatter.code !== FEATURED_PARTNERSHIP_CODE);

  const grouped: Record<string, DocSummary[]> = { O: [], W: [], D: [], C: [], R: [], PMNCH: [] };
  for (const doc of rest) {
    const key = doc.frontmatter.org === 'PMNCH' ? 'PMNCH' : doc.frontmatter.block;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(doc);
  }

  const sectionOrder = [...BLOCK_ORDER.filter((k) => k !== 'R'), 'PMNCH', 'R'];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Partnership knowledge base</h2>
        <p className="text-slate-600 max-w-2xl text-sm">
          Reference documents for UNFPA partnership development. Covers UNFPA&apos;s mandate, programmes, partnership models,
          climate-SRHR evidence, and Singapore&apos;s finance ecosystem.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {docs.length} documents · {docs.reduce((sum, d) => sum + d.wordCount, 0).toLocaleString()} words
        </p>
      </div>

      {featured && (
        <section className="mb-10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Start here
          </h3>
          <FeaturedCard doc={featured} />
        </section>
      )}

      <div className="space-y-10">
        {sectionOrder.map((blockKey) => {
          const blockDocs = grouped[blockKey];
          if (!blockDocs || blockDocs.length === 0) return null;
          const meta = BLOCK_LABELS[blockKey];
          const colors = BLOCK_COLORS[blockKey];

          return (
            <section key={blockKey}>
              <div className="mb-4 pb-2 border-b border-slate-200">
                <div className="flex items-baseline gap-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                    {blockKey}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800">{meta.label}</h2>
                  <span className="text-sm text-slate-400">{blockDocs.length} documents</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{meta.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {blockDocs.map((doc) => (
                  <DocCard key={doc.slug} doc={doc} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function ClinicalView() {
  const docs = getAllClinicalDocs();

  const byPublisher: Record<string, ClinicalDocSummary[]> = {};
  for (const doc of docs) {
    const key = doc.meta.publisher || 'Other';
    (byPublisher[key] ||= []).push(doc);
  }

  const publisherOrder = [
    ...PUBLISHER_ORDER.filter((p) => byPublisher[p]),
    ...Object.keys(byPublisher).filter((p) => !PUBLISHER_ORDER.includes(p)),
  ];

  const totalChunks = docs.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Clinical knowledge base</h2>
        <p className="text-slate-600 max-w-2xl text-sm">
          Reference guidelines and essential medicines for frontline health workers — sourced from WHO, UNFPA, and
          national health authorities. Content is surfaced through the Clinical Reference chat with citations to the
          original page and section.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {docs.length} sources · {totalChunks} chunks
        </p>
      </div>

      {docs.length === 0 && (
        <p className="text-sm text-slate-500">
          No clinical sources are currently loaded. Run <code className="text-xs bg-slate-100 px-1 rounded">scripts/ingest-clinical.ts</code> to populate.
        </p>
      )}

      <div className="space-y-10">
        {publisherOrder.map((pub) => {
          const pubDocs = byPublisher[pub];
          return (
            <section key={pub}>
              <div className="mb-4 pb-2 border-b border-slate-200">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {pub === 'World Health Organization' ? 'WHO' : pub}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800">{pub}</h2>
                  <span className="text-sm text-slate-400">{pubDocs.length} sources</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pubDocs.map((doc) => (
                  <ClinicalDocCard key={doc.slug} doc={doc} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Clinical safety note:</span> content here is for reference
          only and must not replace clinical judgment. &quot;Unverified&quot; sources have been ingested but not yet reviewed
          by a licensed clinician. Always cross-check dosing and contraindications against local protocols.
        </p>
      </div>
    </>
  );
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const view: View = params.view === 'clinical' ? 'clinical' : 'partnership';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Knowledge Base</h1>
        <p className="text-slate-500 text-sm">
          Two libraries — partnership reference for funder conversations, and clinical reference for frontline workers.
        </p>
      </div>

      <TabNav view={view} />

      {view === 'partnership' ? <PartnershipView /> : <ClinicalView />}

      <div className="mt-12 pt-6 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-400">
          Something wrong or out of date?{' '}
          <a href="mailto:UNFPA@ontheground.agency" className="text-blue-500 hover:underline">
            Send feedback to UNFPA@ontheground.agency
          </a>
        </p>
      </div>
    </div>
  );
}
