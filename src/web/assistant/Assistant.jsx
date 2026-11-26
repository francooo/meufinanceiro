/* Assistente financeira (web): botão flutuante + painel de chat com texto e voz.
 *
 * A IA só propõe (POST /api/assistant/chat). O cartão de confirmação chama
 * `onConfirm(kind, data)`, que o App liga a saveEntry / saveWish /
 * saveShoppingItem — o mesmo caminho dos formulários. Nada é gravado sem o toque
 * em Confirmar, e nenhum erro é escondido: falhas aparecem no próprio painel.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Mic, Send, Sparkles, Square, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { catMeta } from "../lib/catalog.jsx";
import { fmt, formatDateBR, monthLabel } from "../lib/format.js";
import { ACTION_LABELS, LIST_LABELS, isActionable, toEntry } from "./proposal.js";

const HISTORY_LIMIT = 12;
const SUGGESTIONS = [
  "Crie um gasto de R$ 50 no mercado, descontar do CLT",
  "Recebi R$ 300 de freela",
  "Adiciona leite na lista do mercado",
  "Quanto sobrou do CLT este mês?",
];

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/* Mesmo contrato do apiFetch do App: 401 avisa a sessão perdida. Erro vira
   Error com a mensagem do servidor, para o painel mostrar. */
async function request(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Não foi possível falar com o servidor. Verifique sua conexão.");
  }
  if (res.status === 401) window.dispatchEvent(new Event("mf:unauthorized"));
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* corpo vazio ou não-JSON: a mensagem genérica abaixo cobre */
  }
  if (!res.ok) throw new Error(body?.error || `Falha na requisição (HTTP ${res.status}).`);
  return body;
}

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* ---------- estado da conversa (vive no App: sobrevive a fechar o painel) ---------- */

export function useAssistantChat(month) {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);

  const ask = useCallback(
    async (history) => {
      setThinking(true);
      setError(null);
      try {
        const res = await request("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content })),
            month,
            today: currentMonthKey(),
          }),
        });
        const proposal = res?.proposal && isActionable(res.proposal) ? { ...res.proposal, status: "pending" } : null;
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: res?.reply || "Não entendi. Pode repetir?", proposal },
        ]);
      } catch (err) {
        setError(err);
      } finally {
        setThinking(false);
      }
    },
    [month]
  );

  const send = useCallback(
    (raw) => {
      const content = String(raw || "").trim();
      if (!content || thinking) return;
      const next = [...messages, { id: newId(), role: "user", content }];
      setMessages(next);
      ask(next);
    },
    [messages, thinking, ask]
  );

  const retry = useCallback(() => {
    if (!thinking && messages.length) ask(messages);
  }, [messages, thinking, ask]);

  /* Marca o desfecho e registra no chat, para a IA saber o que já foi lançado. */
  const settle = useCallback((messageId, status, note) => {
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId && m.proposal ? { ...m, proposal: { ...m.proposal, status } } : m)),
      ...(note ? [{ id: newId(), role: "assistant", content: note }] : []),
    ]);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, thinking, error, send, retry, settle, clear };
}

/* ---------- gravação de voz ---------- */

const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const voiceSupported = () =>
  typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined";

function useVoice(onText) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);

  const upload = async (blob, type) => {
    setTranscribing(true);
    try {
      const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", blob, `audio.${ext}`);
      const res = await request("/api/assistant/transcribe", { method: "POST", body: form });
      const text = String(res?.text || "").trim();
      if (text) onText(text);
    } catch (err) {
      setError(err);
    } finally {
      setTranscribing(false);
    }
  };

  const start = async () => {
    setError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(new Error("Sem acesso ao microfone. Libere a permissão no navegador e tente de novo."));
      return;
    }
    const type = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      setRecording(false);
      const finalType = rec.mimeType || type || "audio/webm";
      const blob = new Blob(chunks, { type: finalType });
      if (blob.size) upload(blob, finalType);
      else setError(new Error("A gravação saiu vazia. Tente de novo."));
    };
    recRef.current = rec;
    rec.start();
    setSeconds(0);
    setRecording(true);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();

  /* Fechar a página/painel no meio não pode deixar o microfone aceso. */
  const cancel = () => {
    const rec = recRef.current;
    if (rec?.state === "recording") {
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setRecording(false);
      };
      rec.stop();
    }
  };
  useEffect(() => cancel, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { recording, transcribing, seconds, error, start, stop, cancel, clearError: () => setError(null) };
}

/* ---------- botão flutuante ---------- */

export function AssistantButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Assistente financeira"
      aria-label="Abrir assistente financeira"
      className="pointer-events-auto touch-manipulation h-14 w-14 rounded-2xl bg-champagne text-forest shadow-[0_14px_30px_-10px_rgba(11,48,37,0.55)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-forest-2"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}

/* ---------- painel ---------- */

export function AssistantPanel({ chat, month, months, switchingMonth, onClose, onConfirm, onGoToMonth }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const voice = useVoice((text) => chat.send(text));
  const busy = chat.thinking || voice.transcribing;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, busy, chat.error]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const close = () => {
    voice.cancel();
    onClose();
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!draft.trim() || busy) return;
    chat.send(draft);
    setDraft("");
  };

  return (
    <div
      role="dialog"
      aria-label="Assistente financeira"
      className="fixed z-50 inset-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[420px] sm:h-[min(640px,calc(100vh-3rem))] flex flex-col bg-canvas sm:rounded-[20px] border border-line shadow-2xl overflow-hidden"
    >
      {/* cabeçalho */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-line pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="h-8 w-8 rounded-full bg-forest-2 text-white flex items-center justify-center">
          <Sparkles size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-[18px] text-heading leading-tight">Assistente</p>
          <p className="text-[12px] text-muted truncate">{monthLabel(month)}</p>
        </div>
        {chat.messages.length > 0 && (
          <button type="button" onClick={chat.clear} aria-label="Limpar conversa" title="Limpar conversa"
            className="h-9 w-9 rounded-full text-muted hover:bg-surface-2 flex items-center justify-center">
            <Trash2 size={17} />
          </button>
        )}
        <button type="button" onClick={close} aria-label="Fechar assistente"
          className="h-9 w-9 rounded-full border border-line text-ink hover:bg-surface-2 flex items-center justify-center">
          <X size={18} />
        </button>
      </div>

      {/* conversa */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chat.messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[14px] text-muted leading-relaxed">
              Peça por texto ou pelo microfone. Se faltar alguma informação, eu pergunto. Nada é salvo sem a sua confirmação.
            </p>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => chat.send(s)}
                className="w-full text-left text-[14px] text-ink bg-surface border border-line rounded-xl px-3.5 py-2.5 hover:border-champagne/60">
                {s}
              </button>
            ))}
          </div>
        )}

        {chat.messages.map((m) => (
          <div key={m.id} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={
              "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap " +
              (m.role === "user" ? "bg-forest-2 text-white rounded-br-md" : "bg-surface border border-line text-ink rounded-bl-md")
            }>
              {m.content}
              {m.proposal && (
                <ProposalCard
                  proposal={m.proposal}
                  month={month}
                  months={months}
                  switchingMonth={switchingMonth}
                  onGoToMonth={onGoToMonth}
                  onConfirm={() => {
                    const entry = toEntry(m.proposal);
                    onConfirm(entry.kind, entry.data);
                    chat.settle(m.id, "saved", `${ACTION_LABELS[m.proposal.action].done} ✓`);
                  }}
                  onCancel={() => chat.settle(m.id, "cancelled", "Tudo bem, descartei.")}
                />
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface border border-line px-3.5 py-2.5 text-[14px] text-muted">
              <Loader2 size={15} className="animate-spin" />
              {voice.transcribing ? "Transcrevendo áudio…" : "Pensando…"}
            </div>
          </div>
        )}

        <ErrorNote error={chat.error} onRetry={chat.retry} />
        <ErrorNote error={voice.error} onDismiss={voice.clearError} />
      </div>

      {/* entrada */}
      <form onSubmit={submit} className="flex items-end gap-2 p-3 bg-surface border-t border-line pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {voice.recording ? (
          <div className="flex-1 h-11 flex items-center gap-2 px-3 text-[15px] text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-coral animate-pulse" />
            Gravando… {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={1}
            disabled={busy}
            placeholder="Peça algo à assistente"
            className="flex-1 resize-none max-h-32 min-h-[44px] rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-champagne/60 disabled:opacity-60"
          />
        )}
        {draft.trim() && !voice.recording ? (
          <button type="submit" disabled={busy} aria-label="Enviar mensagem"
            className="h-11 w-11 shrink-0 rounded-full bg-forest-2 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40">
            <Send size={18} />
          </button>
        ) : voiceSupported() ? (
          <button type="button" disabled={busy}
            onClick={voice.recording ? voice.stop : voice.start}
            aria-label={voice.recording ? "Parar e enviar áudio" : "Falar com a assistente"}
            className={"h-11 w-11 shrink-0 rounded-full text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 " +
              (voice.recording ? "bg-coral" : "bg-forest-2")}>
            {voice.recording ? <Square size={16} /> : <Mic size={18} />}
          </button>
        ) : null}
      </form>
    </div>
  );
}

/* ---------- cartão de confirmação ---------- */

function ProposalCard({ proposal, month, months, switchingMonth, onGoToMonth, onConfirm, onCancel }) {
  const { action, data, status } = proposal;
  const entry = toEntry(proposal);
  const target = entry.month || month;
  /* A web só edita o mês que está na tela (o autosave regrava esse mês). Se a
     proposta é de outro mês, primeiro troca de mês, depois confirma. */
  const otherMonth = (entry.kind === "expense" || entry.kind === "income") && target !== month;
  const targetExists = months.includes(target);

  return (
    <div className="mt-2.5 rounded-xl border border-line bg-canvas p-3 space-y-2 text-ink">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {ACTION_LABELS[action].title}
        {entry.kind === "expense" || entry.kind === "income" ? ` · ${monthLabel(target)}` : ""}
      </p>

      {entry.kind === "expense" && <ExpenseFields d={entry.data} />}
      {entry.kind === "income" && <IncomeFields d={entry.data} />}
      {(entry.kind === "wish" || entry.kind === "mercado" || entry.kind === "farmacia") && (
        <>
          <Headline title={entry.data.title} value={entry.data.value} hideZero />
          <Row label="Lista" value={LIST_LABELS[data.list] || data.list} />
          {entry.data.note && <Row label="Obs." value={entry.data.note} />}
        </>
      )}

      {status === "saved" ? (
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-positive"><Check size={15} /> Lançado</p>
      ) : status === "cancelled" ? (
        <p className="text-[13px] font-semibold text-muted">Descartado</p>
      ) : otherMonth ? (
        <div className="space-y-2 pt-1">
          <p className="text-[13px] text-muted">Para lançar em {monthLabel(target)}, abra esse mês primeiro.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="h-10 px-4 rounded-xl border border-line text-[14px] font-medium text-muted hover:bg-surface-2">Cancelar</button>
            <button type="button" disabled={!targetExists || switchingMonth} onClick={() => onGoToMonth(target)}
              className="flex-1 h-10 rounded-xl bg-forest-2 text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-40">
              {switchingMonth ? "Abrindo…" : `Ir para ${monthLabel(target)}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-line text-[14px] font-medium text-muted hover:bg-surface-2">Cancelar</button>
          <button type="button" onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-forest-2 text-white text-[14px] font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5">
            <Check size={16} /> Confirmar
          </button>
        </div>
      )}
    </div>
  );
}

function ExpenseFields({ d }) {
  const meta = catMeta(d.category);
  const Icon = meta.icon;
  const tags = [
    d.paidWithCltPj && "Desconta do CLT-PJ",
    d.paidWithVoucher && "Vale",
    d.recurrent && "Recorrente",
    d.installmentTotal && `${d.installmentTotal}x parcelado`,
  ].filter(Boolean);
  return (
    <>
      <Headline title={d.description} value={d.value} />
      <div className="flex items-center gap-2 text-[13px]">
        {Icon && <Icon size={14} style={{ color: meta.color }} />}
        <span className="text-muted w-[84px] shrink-0">Categoria</span>
        <span className="truncate">{d.category}</span>
      </div>
      {d.paymentMethod && <Row label="Pagamento" value={d.paymentMethod} />}
      {d.dueDate && <Row label="Vencimento" value={formatDateBR(d.dueDate)} />}
      {d.note && <Row label="Obs." value={d.note} />}
      <Tags items={tags} />
    </>
  );
}

function IncomeFields({ d }) {
  const tags = [d.cltPjIncome && "CLT-PJ", d.voucherIncome && "Vale", d.recurrent && "Recorrente"].filter(Boolean);
  return (
    <>
      <Headline title={d.source} value={d.value} positive />
      {d.receiptDate && <Row label="Recebimento" value={formatDateBR(d.receiptDate)} />}
      {d.note && <Row label="Obs." value={d.note} />}
      <Tags items={tags} />
    </>
  );
}

function Headline({ title, value, positive, hideZero }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-[15px] text-heading truncate">{title}</span>
      {hideZero && !value ? null : (
        <span className={"font-semibold tabular-nums text-[16px] " + (positive ? "text-positive" : "text-coral")}>{fmt(value)}</span>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-muted w-[84px] shrink-0 pl-[22px]">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function Tags({ items }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="text-[11px] font-semibold text-forest-2 dark:text-mint bg-tint-green rounded-full px-2 py-0.5">{t}</span>
      ))}
    </div>
  );
}

function ErrorNote({ error, onRetry, onDismiss }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-coral/40 bg-tint-coral px-3.5 py-3 text-[13px] text-ink space-y-2">
      <p className="flex items-center gap-1.5 font-semibold text-coral"><AlertTriangle size={15} /> Não foi possível concluir</p>
      <p>{error.message}</p>
      {(onRetry || onDismiss) && (
        <button type="button" onClick={onRetry || onDismiss}
          className="h-9 px-3 rounded-lg border border-line bg-surface text-[13px] font-medium hover:bg-surface-2">
          {onRetry ? "Tentar novamente" : "Ok"}
        </button>
      )}
    </div>
  );
}
