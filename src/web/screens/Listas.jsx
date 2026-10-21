/* Listas — Desejos (desejos.jpg), Mercado (mercado.jpg) e Farmácia (farmacia.jpg). */
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, GripVertical, Heart, Info, Pencil, Pill, Plus, ShoppingBasket, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { ActionMenu, Button, Checkbox, Chip, EmptyState, IconAction, IconBubble, PageHeader, Panel, PanelTitle } from "../ui/core.jsx";
import { fmt, formatDateBR, monthName, sumValues } from "../lib/format.js";
import { BigAmount, SelectionBanner, SummaryLabel, SummaryMeta } from "./shared.jsx";

function ListSummary({ icon, label, total, meta }) {
  return (
    <Panel className="mb-4 flex items-center gap-5 sm:gap-7">
      <IconBubble icon={icon} tone="coral" size="lg" />
      <div className="min-w-0">
        <SummaryLabel>
          <span className="inline-flex items-center gap-2">
            {label} <Info size={16} className="text-gold" aria-hidden="true" />
          </span>
        </SummaryLabel>
        <BigAmount className="mt-1" tone="coral">{fmt(total)}</BigAmount>
        <SummaryMeta>{meta}</SummaryMeta>
      </div>
    </Panel>
  );
}

// "Para novembro" vindo da data desejada; senão a observação; senão "Sem data".
function wishTag(w) {
  if (w.targetDate) {
    const sameYear = w.targetDate.slice(0, 4) === String(new Date().getFullYear());
    return `Para ${monthName(w.targetDate)}${sameYear ? "" : ` de ${w.targetDate.slice(0, 4)}`}`;
  }
  return w.note || "Sem data";
}

export function Desejos({ pending, done, onAdd, onEdit, onDelete, onToggleDone, onMove, onReorder, selecting, isSelected, onToggleSelect }) {
  const [dragId, setDragId] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const total = sumValues(pending);

  // Arrastar e soltar (HTML5): solta antes do item sob o cursor; "…" oferece o
  // mesmo pelo teclado (mover para cima/baixo).
  const drop = (toIdx) => {
    const from = pending.findIndex((w) => w.id === dragId);
    setDragId(null);
    setOverIdx(null);
    if (from < 0 || toIdx == null || toIdx === from) return;
    const ids = pending.map((w) => w.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(toIdx > from ? toIdx - 1 : toIdx, 0, moved);
    onReorder(ids);
  };

  const row = (w, idx, isDone) => (
    <div
      key={w.id}
      draggable={!isDone && !selecting}
      onDragStart={(e) => {
        setDragId(w.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", w.id);
      }}
      onDragOver={(e) => {
        if (isDone || !dragId) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setOverIdx(e.clientY < r.top + r.height / 2 ? idx : idx + 1);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!isDone) drop(overIdx);
      }}
      onDragEnd={() => {
        setDragId(null);
        setOverIdx(null);
      }}
      className={
        "relative flex flex-wrap sm:flex-nowrap items-center gap-x-3 sm:gap-x-4 gap-y-2 py-4 border-t border-line first:border-t-0 " +
        (dragId === w.id ? "opacity-40" : "")
      }
    >
      {!isDone && overIdx === idx && dragId && <span className="absolute -top-px left-0 right-0 h-0.5 bg-champagne rounded" />}
      {!isDone && overIdx === idx + 1 && idx === pending.length - 1 && dragId && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-champagne rounded" />
      )}
      {selecting ? (
        <Checkbox checked={isSelected(w.id)} onChange={() => onToggleSelect(w.id)} label={`Selecionar ${w.title}`} />
      ) : !isDone ? (
        <span className="hidden sm:flex text-muted cursor-grab active:cursor-grabbing" title="Arraste para reordenar" aria-hidden="true">
          <GripVertical size={22} />
        </span>
      ) : null}
      {!isDone && (
        <span className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-full bg-tint-gold text-gold font-display text-[16px] sm:text-[18px] flex items-center justify-center">
          {idx + 1}
        </span>
      )}
      <IconBubble icon={Sparkles} className="hidden sm:flex" />
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={"font-display text-[17px] sm:text-[19px] truncate " + (isDone ? "text-muted line-through" : "text-ink")}>{w.title}</span>
        {isDone ? (
          <span className="text-[13px] text-positive">Realizado em {formatDateBR(w.doneAt)}</span>
        ) : (
          <Chip tone={w.targetDate ? "green" : "neutral"}>{wishTag(w)}</Chip>
        )}
      </div>
      {w.value > 0 && (
        <span className={"font-display text-[17px] sm:text-[21px] tabular-nums " + (isDone ? "text-muted line-through" : "text-coral")}>{fmt(w.value)}</span>
      )}
      <div className="flex items-center ml-auto sm:ml-0">
        <IconAction icon={Check} label={isDone ? "Desfazer realizado" : "Marcar como realizado"} onClick={() => onToggleDone(w)} active={isDone} tone="green" />
        <IconAction icon={Pencil} label="Editar" onClick={() => onEdit(w)} />
        <ActionMenu
          items={[
            !isDone && { label: "Mover para cima", icon: ArrowUp, onClick: () => onMove(w.id, "up"), disabled: idx === 0 },
            !isDone && { label: "Mover para baixo", icon: ArrowDown, onClick: () => onMove(w.id, "down"), disabled: idx === pending.length - 1 },
            { label: "Excluir", icon: Trash2, onClick: () => onDelete(w), danger: true },
          ]}
        />
      </div>
    </div>
  );

  const count = pending.length;
  return (
    <div>
      <PageHeader title="Desejos" subtitle="Priorize seus próximos objetivos" actions={<Button icon={Plus} size="lg" onClick={onAdd}>Novo desejo</Button>} />
      {selecting ? (
        <SelectionBanner text="Selecione os desejos que deseja somar" />
      ) : (
        <ListSummary icon={Heart} label="Total desejado" total={total} meta={`${count} ${count === 1 ? "objetivo" : "objetivos"}`} />
      )}
      {pending.length === 0 && done.length === 0 ? (
        <Panel>
          <EmptyState icon={Heart} title="Nenhum desejo cadastrado" text="Adicione um objetivo à sua lista de prioridades." action={<Button icon={Plus} size="lg" onClick={onAdd}>Novo desejo</Button>} />
        </Panel>
      ) : (
        <Panel>
          <PanelTitle>Prioridades</PanelTitle>
          {pending.length === 0 ? (
            <p className="py-4 text-[15px] text-muted">Todos os desejos foram realizados.</p>
          ) : (
            <div onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOverIdx(null)}>{pending.map((w, i) => row(w, i, false))}</div>
          )}
          {done.length > 0 && (
            <div className="mt-2 border-t border-line pt-3">
              <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-2 text-[15px] text-ink py-1">
                <ChevronDown size={18} className={"transition-transform " + (showDone ? "" : "-rotate-90")} /> Realizados ({done.length})
              </button>
              {showDone && <div className="mt-1">{done.map((w, i) => row(w, i, true))}</div>}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const LIST_CFG = {
  mercado: { title: "Mercado", subtitle: "Sua lista de compras do mês", icon: ShoppingCart, rowIcon: ShoppingBasket, doneLabel: "Comprado" },
  farmacia: { title: "Farmácia", subtitle: "Seus itens de farmácia do mês", icon: Pill, rowIcon: Pill, doneLabel: "Comprado" },
};

export function ListaCompras({ kind, items, onAdd, onEdit, onDelete, onToggleDone, onClearDone, selecting, isSelected, onToggleSelect }) {
  const cfg = LIST_CFG[kind];
  const [showDone, setShowDone] = useState(true);
  const pending = items.filter((it) => !it.doneAt);
  const done = items.filter((it) => it.doneAt);

  const row = (it, idx, isDone) => (
    <div key={it.id} className="group flex items-center gap-3 sm:gap-4 py-3.5 border-t border-line first:border-t-0">
      {selecting && <Checkbox checked={isSelected(it.id)} onChange={() => onToggleSelect(it.id)} label={`Selecionar ${it.title}`} />}
      <Checkbox
        checked={isDone}
        onChange={() => onToggleDone(it)}
        label={isDone ? `Desmarcar ${it.title} como comprado` : `Marcar ${it.title} como comprado`}
        className={selecting ? "opacity-50" : ""}
      />
      <IconBubble icon={cfg.rowIcon} tone={idx % 2 ? "coral" : "green"} />
      <div className="min-w-0 flex-1">
        <p className={"text-[15px] sm:text-[16px] truncate " + (isDone ? "text-muted" : "text-ink")}>
          {it.title}
          {it.quantity && <span className={isDone ? "" : "text-ink"}> · {it.quantity}</span>}
        </p>
        <p className="text-[13px] text-muted truncate">
          {isDone ? `${cfg.doneLabel} em ${formatDateBR(it.doneAt)}` : it.note}
        </p>
      </div>
      {it.value > 0 && (
        <span className={"font-display text-[16px] sm:text-[18px] tabular-nums " + (isDone ? "text-muted line-through" : "text-ink")}>{fmt(it.value)}</span>
      )}
      <div className="flex items-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <IconAction icon={Pencil} label="Editar" onClick={() => onEdit(it)} />
        <ActionMenu items={[{ label: "Excluir", icon: Trash2, onClick: () => onDelete(it), danger: true }]} />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
          <>
            <Button icon={Plus} size="lg" onClick={onAdd}>Novo item</Button>
            {onClearDone && (
              <Button variant="secondary" icon={Trash2} size="lg" onClick={onClearDone} disabled={done.length === 0} title="Remove os itens já comprados">
                Limpar
              </Button>
            )}
          </>
        }
      />
      {selecting ? (
        <SelectionBanner text="Selecione os itens que deseja somar" />
      ) : (
        <ListSummary
          icon={cfg.icon}
          label="Total estimado"
          total={sumValues(pending)}
          meta={`${pending.length} ${pending.length === 1 ? "item" : "itens"} na lista`}
        />
      )}
      {items.length === 0 ? (
        <Panel>
          <EmptyState icon={cfg.icon} title="Nenhum item na lista" text="Adicione o que você precisa comprar." action={<Button icon={Plus} size="lg" onClick={onAdd}>Novo item</Button>} />
        </Panel>
      ) : (
        <Panel>
          <PanelTitle>Itens da lista</PanelTitle>
          {pending.length === 0 ? <p className="py-4 text-[15px] text-muted">Tudo comprado.</p> : pending.map((it, i) => row(it, i, false))}
          {done.length > 0 && (
            <div className="mt-2 border-t border-line pt-3">
              <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-2 text-[15px] text-ink py-1">
                <ChevronDown size={18} className={"transition-transform " + (showDone ? "" : "-rotate-90")} /> Comprados ({done.length})
              </button>
              {showDone && <div className="mt-1">{done.map((it, i) => row(it, i, true))}</div>}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
