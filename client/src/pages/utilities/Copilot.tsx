import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, Button, Input, StatGrid, tokens } from '@/components/ui';
import { cn } from '@/lib/utils';
import { resolveCopilotLink } from '@/lib/copilotLinks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AiProposal, AiStatus, AiToolTraceEntry } from '@/types/api/Ai';
import BillScanView from './BillScanView';

type ProposalState = AiProposal & { running?: boolean };
type Msg = {
  role: 'user' | 'assistant';
  text: string;
  proposals?: ProposalState[];
  toolTrace?: AiToolTraceEntry[];
};

// "trial_balance, lookup ledger (failed)": what the agent consulted for an answer.
const traceLabel = (t: AiToolTraceEntry) => {
  const name =
    t.tool === 'query'
      ? t.input?.resource || 'query'
      : t.tool === 'lookup' || t.tool === 'propose'
        ? `${t.tool} ${t.input?.kind || t.input?.action || ''}`.trim()
        : t.tool;
  return t.ok ? name : `${name} (failed)`;
};
const sourcesLine = (trace: AiToolTraceEntry[]) =>
  Array.from(new Set(trace.map(traceLabel))).join(', ');

const SUGGESTIONS = [
  'What is my cash balance?',
  'Show the trial balance',
  'List unreconciled bank entries',
  'Which bills are overdue?',
];

export default function Copilot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [view, setView] = useState<'chat' | 'scan'>('scan');
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.api.ai.getKeyStatus().then(setStatus);
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, thinking]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const send = useCallback(
    async (overridePrompt?: string) => {
      const prompt = (overridePrompt || input).trim();
      if (!prompt || thinking) return;
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      setMessages((m) => [...m, { role: 'user', text: prompt }]);
      setInput('');
      setThinking(true);
      const res = await window.api.ai.ask({
        prompt,
        context: { company_id: selectedCompany?.company_id, fy_id: activeFY?.fy_id },
        history,
      });
      setThinking(false);
      setMessages((m) => [
        ...m,
        res.success
          ? {
              role: 'assistant',
              text: res.text || '(no answer)',
              proposals: res.proposals,
              toolTrace: res.toolTrace,
            }
          : { role: 'assistant', text: `⚠ ${res.error}` },
      ]);
    },
    [input, thinking, messages, selectedCompany, activeFY],
  );

  // Auto-send an initial prompt when navigated here from a report ("Ask AI" / Alt+A).
  useEffect(() => {
    if (location.state?.initialPrompt && messages.length === 0 && !thinking) {
      const p = location.state.initialPrompt;
      setView('chat'); // the answer appears in the chat view, not behind Scan Bill (F8)
      setTimeout(() => {
        navigate('.', { replace: true, state: {} });
        send(p);
      }, 50);
    }
  }, [location.state, messages.length, thinking, navigate, send]);

  // Approvals in flight, keyed "message:proposal". A ref rather than state, so a double
  // click cannot start a second write before React re-renders (F7).
  const approving = useRef(new Set<string>());

  const updateProposal = (mi: number, idx: number, patch: Partial<ProposalState>) =>
    setMessages((m) =>
      m.map((msg, i) =>
        i !== mi
          ? msg
          : {
              ...msg,
              proposals: msg.proposals?.map((pp, j) => (j !== idx ? pp : { ...pp, ...patch })),
            },
      ),
    );

  // Execute an approved proposal via its declared IPC channel (e.g. automation:createVoucher).
  const approve = async (p: ProposalState, idx: number, mi: number) => {
    const key = `${mi}:${idx}`;
    if (approving.current.has(key)) return;
    const [ns, action] = p.channel.split(':');
    const fn = (window.api as any)?.[ns]?.[action];
    if (typeof fn !== 'function') {
      alert(`Cannot run ${p.channel}`);
      return;
    }
    approving.current.add(key); // stays set: a proposal runs at most once
    updateProposal(mi, idx, { running: true });
    let result: any;
    try {
      result = await fn(p.args);
    } catch (err) {
      result = { success: false, error: (err as Error).message };
    }
    const ok = result?.success !== false;
    // Channels report failure as error (most), errors[] (automation) or message.
    const reason = result?.error || result?.errors?.[0] || result?.message || 'unknown error';
    updateProposal(mi, idx, {
      running: false,
      requiresApproval: false,
      summary: ok ? `Done: ${p.summary}` : `Failed: ${reason}`,
    });
  };

  const configured = status?.hasKey ?? false;
  const loading = status === null;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 text-xs select-none">
      <PageTitleBar
        title="AI Copilot"
        subtitle={selectedCompany?.name}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border border-zinc-300 text-[10px] overflow-hidden">
              <button
                onClick={() => setView('scan')}
                className={cn(
                  'px-2.5 py-1 font-medium',
                  view === 'scan'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100',
                )}
              >
                Scan Bill
              </button>
              <button
                onClick={() => setView('chat')}
                className={cn(
                  'px-2.5 py-1 font-medium border-l border-zinc-300',
                  view === 'chat'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100',
                )}
              >
                Chat
              </button>
            </div>
            {configured && status?.model && view === 'chat' && (
              <span className="text-zinc-400 text-[10px]">{status.model}</span>
            )}
          </div>
        }
      />

      {view === 'scan' && <BillScanView />}

      {view === 'chat' && (
        <>
          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
            {!loading && !configured && (
              <div className="max-w-md mx-auto border border-zinc-200 border-l-2 border-l-zinc-900 bg-white px-4 py-3 space-y-1">
                <div className="font-bold text-zinc-900">AI is not configured</div>
                <div className="text-zinc-600 leading-relaxed">
                  Set <code className="text-zinc-900">AI_API_KEY</code> in the server{' '}
                  <code className="text-zinc-900">.env</code> (a Groq key by default) and restart
                  the app.
                </div>
              </div>
            )}

            {configured && messages.length === 0 && (
              <div className="max-w-xl mx-auto text-center space-y-3 pt-4">
                <div className="text-sm font-bold text-zinc-700">Ask about your books</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-[11px] px-3 py-1.5 border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((m, mi) => (
                <div
                  key={mi}
                  className={cn(
                    'max-w-2xl overflow-hidden',
                    m.role === 'user' ? 'ml-auto' : 'mr-auto',
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 leading-relaxed text-[11px]',
                      m.role === 'user'
                        ? 'bg-zinc-900 text-white whitespace-pre-wrap'
                        : 'bg-white border border-zinc-200 text-zinc-800 prose prose-sm prose-zinc max-w-none',
                    )}
                  >
                    {m.role === 'user' ? (
                      m.text
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, href, children, ...props }) => (
                            <a
                              href={href}
                              {...props}
                              onClick={(e) => {
                                // A link must never navigate the app window itself; in-app
                                // links go through the router, anything else does nothing.
                                e.preventDefault();
                                const target = resolveCopilotLink(href);
                                if (target) navigate(target.to, { state: target.state });
                              }}
                              className="text-zinc-900 font-semibold underline underline-offset-2 hover:text-black cursor-pointer"
                            >
                              {children}
                            </a>
                          ),
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-2">
                              <table className="min-w-full border border-zinc-300" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th
                              className="px-2 py-1 bg-zinc-100 font-bold text-left text-zinc-700 border border-zinc-300"
                              {...props}
                            />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-2 py-1 border border-zinc-200" {...props} />
                          ),
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    )}
                  </div>

                  {m.toolTrace && m.toolTrace.length > 0 && (
                    <div className={cn(tokens.TEXT.label, 'mt-1 text-black')}>
                      Sources: {sourcesLine(m.toolTrace)}
                    </div>
                  )}

                  {m.proposals?.map((p, idx) => (
                    <div
                      key={idx}
                      className="mt-2 border border-zinc-200 border-l-2 border-l-zinc-900 bg-white"
                    >
                      <div className="px-3 py-2 flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                          {p.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-zinc-700 flex-1">{p.summary}</span>
                        {p.requiresApproval && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={p.running}
                            onClick={() => approve(p, idx, mi)}
                          >
                            {p.running ? 'Running...' : 'Approve'}
                          </Button>
                        )}
                      </div>
                      {p.note && (
                        <div className={cn(tokens.TEXT.label, 'px-3 pb-2 text-black')}>
                          {p.note}
                        </div>
                      )}
                      {p.preview && p.preview.length > 0 && (
                        <StatGrid stats={p.preview} className="border-x-0 border-b-0" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {thinking && (
                <div className="text-[11px] text-zinc-400 mr-auto">Copilot is thinking…</div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-zinc-200 bg-white px-4 py-3 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                configured
                  ? 'Ask about your books…'
                  : 'AI is not configured — set AI_API_KEY in .env'
              }
              disabled={!configured || thinking}
              className="h-9"
            />
            <Button
              variant="primary"
              onClick={() => send()}
              disabled={!configured || thinking || !input.trim()}
            >
              Send
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
