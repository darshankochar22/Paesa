import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar } from "@/components/ui";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiProposal, AiStatus, AiProvider } from "@/types/api/Ai";

type Msg = { role: "user" | "assistant"; text: string; proposals?: AiProposal[] };

export default function Copilot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [status, setStatus] = useState<AiStatus | null>(null);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async () => {
    setStatus(await window.api.ai.getKeyStatus());
  }, []);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, thinking]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") navigate("/"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const send = useCallback(async (overridePrompt?: string) => {
    const prompt = (overridePrompt || input).trim();
    if (!prompt || thinking) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput(""); setThinking(true);
    const res = await window.api.ai.ask({
      prompt,
      context: { company_id: selectedCompany?.company_id, fy_id: activeFY?.fy_id },
      history,
    });
    setThinking(false);
    setMessages((m) => [
      ...m,
      res.success
        ? { role: "assistant", text: res.text || "(no answer)", proposals: res.proposals }
        : { role: "assistant", text: `⚠ ${res.error}` },
    ]);
  }, [input, thinking, messages, selectedCompany, activeFY]);

  useEffect(() => {
    if (location.state?.initialPrompt && messages.length === 0 && !thinking) {
      const p = location.state.initialPrompt;
      setTimeout(() => {
        navigate(".", { replace: true, state: {} });
        send(p);
      }, 50);
    }
  }, [location.state, messages.length, thinking, navigate, send]);

  const saveKey = async () => {
    setKeyBusy(true); setKeyMsg(null);
    const res = await window.api.ai.setKey({
      provider,
      apiKey: keyInput.trim(),
      baseUrl: provider === "openai" ? baseUrl.trim() : null,
      model: model.trim() || null,
    });
    setKeyBusy(false);
    if (res.success) {
      setKeyInput(""); setKeyMsg("Saved. Verifying…");
      const t = await window.api.ai.testKey();
      setKeyMsg(t.success ? `Verified ✓ (${t.provider} · ${t.model})` : `Saved, but test failed: ${t.error}`);
      refreshStatus();
    } else setKeyMsg(res.error || "Failed to save");
  };
  const useDeepSeek = () => { setProvider("openai"); setBaseUrl("https://api.deepseek.com/v1"); setModel("deepseek-chat"); };
  const removeKey = async () => { await window.api.ai.clearKey(); setKeyMsg(null); refreshStatus(); };



  const approve = async (p: AiProposal, idx: number, mi: number) => {
    const [ns, action] = p.channel.split(":");
    const fn = (window.api as any)?.[ns]?.[action];
    if (typeof fn !== "function") { alert(`Cannot run ${p.channel}`); return; }
    const result = await fn(p.args);
    const ok = result?.success !== false;
    setMessages((m) => m.map((msg, i) => i !== mi ? msg : {
      ...msg,
      proposals: msg.proposals?.map((pp, j) => j !== idx ? pp : { ...pp, summary: ok ? `✓ Done — ${pp.summary}` : `✗ ${result?.error || "failed"}`, requiresApproval: false }),
    }));
  };

  const suggestions = ["What is my cash balance?", "Show the trial balance", "List unreconciled bank entries", "Which bills are overdue?"];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 text-xs select-none">
      <PageTitleBar title="AI Copilot" subtitle={selectedCompany?.name} />

      {/* BYOK setup */}
      <div className="border-b border-zinc-200 bg-white px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">AI Model</span>
        {status?.hasKey ? (
          <>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{status.masked}</Badge>
            <span className="text-[10px] text-zinc-400">
              {status.provider} · {status.model || "default"}{status.baseUrl ? ` · ${status.baseUrl}` : ""}
            </span>
            <Button size="xs" variant="ghost" className="text-zinc-500" onClick={() => window.api.ai.testKey().then((t) => setKeyMsg(t.success ? "Key verified ✓" : `Test failed: ${t.error}`))}>Test</Button>
            <Button size="xs" variant="ghost" className="text-red-600" onClick={removeKey}>Remove</Button>
          </>
        ) : (
          <>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="h-7 text-[11px] border border-zinc-300 rounded px-1 bg-white"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI-compatible</option>
            </select>
            <Input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="API key" className="h-7 text-[11px] max-w-[180px]" />
            {provider === "openai" && (
              <>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="h-7 text-[11px] max-w-[220px]" />
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model (e.g. gpt-4o-mini)" className="h-7 text-[11px] max-w-[180px]" />
                <Button size="xs" variant="ghost" className="text-zinc-500" onClick={useDeepSeek}>DeepSeek preset</Button>
              </>
            )}
            <Button size="xs" disabled={keyBusy || !keyInput.trim()} onClick={saveKey}>{keyBusy ? "Saving…" : "Save & verify"}</Button>
            <span className="text-[10px] text-zinc-400">stored encrypted on this device, never sent to the renderer</span>
          </>
        )}
        {keyMsg && <span className="text-[10px] text-zinc-600">{keyMsg}</span>}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="max-w-xl mx-auto text-center text-zinc-500 space-y-3 pt-6">
            <div className="text-sm font-bold text-zinc-700">Ask about your books</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-[11px] px-3 py-1.5 rounded border border-zinc-200 bg-white hover:border-zinc-400">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, mi) => (
          <div key={mi} className={cn("max-w-2xl overflow-hidden", m.role === "user" ? "ml-auto" : "mr-auto")}>
            <div className={cn("rounded-lg px-3 py-2 leading-relaxed text-[11px]", m.role === "user" ? "bg-zinc-900 text-white whitespace-pre-wrap" : "bg-white border border-zinc-200 text-zinc-800 prose prose-sm prose-zinc max-w-none")}>
              {m.role === "user" ? m.text : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, href, children, ...props }) => {
                      return (
                        <a
                          href={href}
                          {...props}
                          onClick={(e) => {
                            if (href?.startsWith("/")) {
                              e.preventDefault();
                              navigate(href);
                            }
                          }}
                          className="text-[#003366] font-semibold underline hover:text-[#002244] cursor-pointer"
                        >
                          {children}
                        </a>
                      );
                    },
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-zinc-200 border border-zinc-200" {...props} /></div>,
                    th: ({ node, ...props }) => <th className="px-2 py-1 bg-zinc-50 font-bold text-left text-zinc-700 border-b" {...props} />,
                    td: ({ node, ...props }) => <td className="px-2 py-1 border-t border-zinc-100" {...props} />,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              )}
            </div>
            {m.proposals?.map((p, idx) => (
              <div key={idx} className="mt-2 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">{p.action}</Badge>
                <span className="text-[11px] text-zinc-700 flex-1">{p.summary}</span>
                {p.requiresApproval && (
                  <Button size="xs" onClick={() => approve(p, idx, mi)}>Approve</Button>
                )}
              </div>
            ))}
          </div>
        ))}
        {thinking && <div className="text-[11px] text-zinc-400 mr-auto">Copilot is thinking…</div>}
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={status?.hasKey ? "Ask about your books…" : "Add your Anthropic key above to start"}
          disabled={!status?.hasKey || thinking}
          className="h-9 text-xs"
        />
        <Button onClick={() => send()} disabled={!status?.hasKey || thinking || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}
