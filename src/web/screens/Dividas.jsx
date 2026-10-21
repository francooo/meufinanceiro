/* Dívidas — Serasa (references/dividas.jpg). */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, CreditCard, Info, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { ActionMenu, Button, Checkbox, EmptyState, IconAction, IconBubble, Meter, PageHeader, Panel, PanelTitle } from "../ui/core.jsx";
import { fmt, formatDayMonth, sumValues } from "../lib/format.js";
import { BigAmount, SearchField, SelectionBanner, SummaryLabel, SummaryMeta } from "./shared.jsx";

function debtMeta(s) {
  const parts = [];
  if (s.paidAt) parts.push(`Pago em ${formatDayMonth(s.paidAt)}`);
  else if (s.dueDate) parts.push(`Vence ${formatDayMonth(s.dueDate)}`);
  if (s.installmentTotal) parts.push(`${s.installmentNumber}/${s.installmentTotal}`);
  if (s.note) parts.push(s.note);
  return parts.join(" · ");
}

export default function Dividas({ grouped, total, items, onAdd, onEdit, onDelete, onTogglePaid, onMove, selecting, isSelected, onToggleSelect, highlightId }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const query = search.trim().toLowerCase();

  const filteredGrouped = useMemo(() => {
    if (!query) return grouped;
    return grouped
      .map((g) => {
        const its = g.name.toLowerCase().includes(query) ? g.items : g.items.filter((s) => s.description.toLowerCase().includes(query));
        return { ...g, items: its, subtotal: sumValues(its) };
      })
      .filter((g) => g.items.length > 0);
  }, [grouped, query]);

  // Ranking de credores: soma por descrição (o credor), maiores primeiro.
  const creditors = useMemo(() => {
    const m = new Map();
    for (const s of items) m.set(s.description, (m.get(s.description) || 0) + (Number(s.value) || 0));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [items]);
  const topValue = creditors[0]?.value || 0;

  const toggle = (name) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div>
      <PageHeader
        title="Dívidas"
        subtitle="Visualize e organize seus compromissos"
        actions={<Button icon={Plus} size="lg" onClick={onAdd}>Nova dívida</Button>}
      />

      {selecting ? (
        <SelectionBanner text="Selecione as dívidas que deseja somar" />
      ) : (
        <Panel className="mb-4 flex items-center gap-5 sm:gap-7">
          <IconBubble icon={CreditCard} tone="coral" size="lg" />
          <div className="min-w-0">
            <SummaryLabel>
              <span className="inline-flex items-center gap-2">
                {query ? "Total encontrado" : "Total de dívidas"} <Info size={16} className="text-gold" aria-hidden="true" />
              </span>
            </SummaryLabel>
            <BigAmount className="mt-1" tone="coral">{fmt(query ? filteredGrouped.reduce((s, g) => s + g.subtotal, 0) : total)}</BigAmount>
            <SummaryMeta>
              {items.length} {items.length === 1 ? "registro" : "registros"}
            </SummaryMeta>
          </div>
        </Panel>
      )}

      {items.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CreditCard}
            title="Nenhuma dívida cadastrada"
            text="Registre seus compromissos para acompanhar o que falta quitar."
            action={<Button icon={Plus} size="lg" onClick={onAdd}>Nova dívida</Button>}
          />
        </Panel>
      ) : (
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Buscar dívida…" className="mb-4 max-w-xl" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <Panel>
              <PanelTitle>Dívidas por tipo</PanelTitle>
              {filteredGrouped.length === 0 && <p className="py-6 text-center text-[15px] text-muted">Nenhuma dívida encontrada.</p>}
              {filteredGrouped.map((g) => {
                const isCollapsed = collapsed.has(g.name);
                return (
                  <div key={g.name} className="border-t border-line py-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-3">
                      <IconBubble icon={g.icon} color={g.color} />
                      <h3 className="font-display text-[18px] sm:text-[20px] text-heading flex-1 min-w-0 truncate">{g.name}</h3>
                      <span className="font-display text-[17px] sm:text-[19px] text-coral tabular-nums">{fmt(g.subtotal)}</span>
                      <button
                        type="button"
                        onClick={() => toggle(g.name)}
                        aria-expanded={!isCollapsed}
                        aria-label={(isCollapsed ? "Expandir " : "Recolher ") + g.name}
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2"
                      >
                        <ChevronDown size={19} className={"transition-transform " + (isCollapsed ? "-rotate-90" : "")} />
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div className="mt-2 sm:pl-14">
                        {g.items.map((s, idx) => {
                          const meta = debtMeta(s);
                          return (
                            <div
                              key={s.id}
                              className={"flex flex-wrap items-center gap-x-3 gap-y-1 py-2 rounded-lg px-1 " + (highlightId === s.id ? "bg-tint-green" : "")}
                            >
                              {selecting ? (
                                <Checkbox checked={isSelected(s.id)} onChange={() => onToggleSelect(s.id)} label={`Selecionar ${s.description}`} />
                              ) : (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color, opacity: 0.55 }} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={"text-[15px] flex items-center gap-1.5 " + (s.paidAt ? "text-muted line-through" : "text-ink")}>
                                  <span className="truncate">{s.description}</span>
                                  {s.recurrent && <Repeat size={13} className="text-muted shrink-0" aria-label="Recorrente" />}
                                </p>
                                {meta && <p className="text-[12px] text-muted truncate">{meta}</p>}
                              </div>
                              <span className="font-display text-[15px] sm:text-[16px] text-ink tabular-nums">{fmt(s.value)}</span>
                              <div className="flex items-center">
                                <IconAction icon={Check} label={s.paidAt ? "Desmarcar quitação" : "Marcar como paga"} onClick={() => onTogglePaid(s)} active={!!s.paidAt} tone="green" />
                                <IconAction icon={Pencil} label="Editar" onClick={() => onEdit(s)} />
                                <ActionMenu
                                  items={[
                                    { label: "Mover para cima", icon: ArrowUp, onClick: () => onMove(s.category, s.id, "up"), disabled: !!query || idx === 0 },
                                    { label: "Mover para baixo", icon: ArrowDown, onClick: () => onMove(s.category, s.id, "down"), disabled: !!query || idx === g.items.length - 1 },
                                    { label: "Excluir", icon: Trash2, onClick: () => onDelete(s), danger: true },
                                  ]}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </Panel>

            <Panel>
              <PanelTitle>Maiores credores</PanelTitle>
              {creditors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4 py-3.5 border-t border-line first:border-t-0 first:pt-0">
                  <span className="h-11 w-11 shrink-0 rounded-full bg-tint-gold text-gold font-display text-[17px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] sm:text-[16px] text-ink truncate">{c.name}</span>
                      <span className="font-display text-[16px] sm:text-[18px] text-coral tabular-nums shrink-0">{fmt(c.value)}</span>
                    </div>
                    <Meter value={c.value} max={topValue} color="linear-gradient(90deg,#c8755f,#d4a06a)" className="mt-2 max-w-[280px]" />
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
