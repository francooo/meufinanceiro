/* Lançamentos — Gastos (references/gastos.jpg, gastos-vazio.jpg, gasto-pago.jpg). */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ChevronDown, CreditCard, Pencil, Plus, ReceiptText, Repeat, Trash2 } from "lucide-react";
import { ActionMenu, Button, Checkbox, EmptyState, IconAction, IconBubble, Meter, PageHeader, Panel, Popover, SelectMenu, StatusPill, Switch } from "../ui/core.jsx";
import { DateInput } from "../ui/form.jsx";
import { allPaymentMethods, CARTOES_CATEGORY, groupByPaymentMethod, PAYMENT_METHOD_FALLBACK, paymentMethodMeta, sortByValueSort } from "../lib/catalog.jsx";
import { fmt, formatDayMonth } from "../lib/format.js";
import { BigAmount, SearchField, SelectionBanner, SummaryLabel, SummaryMeta } from "./shared.jsx";

const subtotalOf = (items) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);
const BAR_COLORS = ["#9fd4b8", "#d9ece2", "#1b805b", "#c8a96a", "#d9ece2", "#1b805b"];

// "Vence 08 out · CLT/PJ · 3/10 · Recorrente"
function expenseMeta(e) {
  const parts = [];
  if (e.paidAt) parts.push(`Pago em ${formatDayMonth(e.paidAt)}`);
  else if (e.dueDate) parts.push(`Vence ${formatDayMonth(e.dueDate)}`);
  if (e.paidWithCltPj) parts.push("CLT/PJ");
  if (e.paidWithVoucher) parts.push("VA");
  if (e.installmentTotal) parts.push(`${e.installmentNumber}/${e.installmentTotal}`);
  return parts.join(" · ");
}

function ExpenseRow({ e, meta, onEdit, onDelete, onTogglePaid, onMoveUp, onMoveDown, selecting, selected, onToggleSelect, highlight }) {
  const paid = !!e.paidAt;
  const muted = !e.value;
  const metaText = expenseMeta(e);
  return (
    <div
      className={
        "flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-3 border-t border-line first:border-t-0 transition-colors " +
        (highlight ? "bg-tint-green" : "")
      }
    >
      {selecting && <Checkbox checked={selected} onChange={onToggleSelect} label={`Selecionar ${e.description}`} />}
      <IconBubble icon={meta.icon} color={meta.color} size="sm" />
      <div className="min-w-0 flex-1 basis-[50%] sm:basis-auto">
        <p className={"font-display text-[16px] sm:text-[17px] leading-tight flex items-center gap-1.5 " + (muted ? "text-muted" : "text-ink")}>
          <span className="truncate">{e.description}</span>
          {e.recurrent && <Repeat size={13} className="text-muted shrink-0" aria-label="Recorrente" />}
        </p>
        {(metaText || e.note) && (
          <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted truncate">{[metaText, e.note].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <span
        className={
          "shrink-0 text-[16px] sm:text-[17px] font-display tabular-nums text-right sm:min-w-[110px] " +
          (muted ? "text-muted" : paid ? "text-ink" : "text-coral")
        }
      >
        {fmt(e.value)}
      </span>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto sm:ml-0">
        <span className="sm:w-[104px] flex sm:justify-center">
          <StatusPill paid={paid} />
        </span>
        <IconAction icon={Check} label={paid ? "Desmarcar pagamento" : "Marcar como pago"} onClick={onTogglePaid} active={paid} tone="green" />
        <IconAction icon={Pencil} label="Editar" onClick={onEdit} />
        <ActionMenu
          items={[
            { label: "Mover para cima", icon: ArrowUp, onClick: onMoveUp, disabled: !onMoveUp },
            { label: "Mover para baixo", icon: ArrowDown, onClick: onMoveDown, disabled: !onMoveDown },
            { label: "Excluir", icon: Trash2, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}

export default function Gastos({
  grouped, total, extraPaymentMethods = [], onAdd, onEdit, onDelete, onTogglePaid, onMove, onMovePaymentMethod,
  selecting, isSelected, onToggleSelect, highlightId,
}) {
  const [search, setSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [valueSort, setValueSort] = useState("none");
  const [hidePaid, setHidePaid] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());

  const query = search.trim().toLowerCase();
  const dueActive = dueDateFrom !== "" || dueDateTo !== "";
  const otherFiltersActive = query !== "" || paymentMethodFilter !== "" || dueActive || valueSort !== "none";
  const filtersActive = otherFiltersActive || hidePaid;

  const allItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);
  const pendingCount = allItems.filter((e) => !e.paidAt).length;

  const clearFilters = () => {
    setSearch("");
    setPaymentMethodFilter("");
    setDueDateFrom("");
    setDueDateTo("");
    setValueSort("none");
    setHidePaid(false);
  };

  const applyCommonFilters = (list) => {
    if (!(query || paymentMethodFilter || dueDateFrom || dueDateTo)) return list;
    return list
      .map((g) => {
        let items = g.items;
        // Busca por título, categoria ou forma de pagamento (como no mobile).
        if (query && !g.name.toLowerCase().includes(query)) {
          items = items.filter(
            (e) => e.description.toLowerCase().includes(query) || (e.paymentMethod || "").toLowerCase().includes(query)
          );
        }
        if (paymentMethodFilter) items = items.filter((e) => (e.paymentMethod || PAYMENT_METHOD_FALLBACK) === paymentMethodFilter);
        if (dueDateFrom) items = items.filter((e) => e.dueDate && e.dueDate >= dueDateFrom);
        if (dueDateTo) items = items.filter((e) => e.dueDate && e.dueDate <= dueDateTo);
        return { ...g, items, subtotal: subtotalOf(items) };
      })
      .filter((g) => g.items.length > 0);
  };

  const filteredGrouped = useMemo(() => {
    let result = applyCommonFilters(grouped);
    if (hidePaid) {
      result = result
        .map((g) => {
          const items = g.items.filter((e) => !e.paidAt);
          return { ...g, items, subtotal: subtotalOf(items) };
        })
        .filter((g) => g.items.length > 0);
    }
    if (valueSort !== "none") result = result.map((g) => ({ ...g, items: sortByValueSort(g.items, valueSort) }));
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, query, paymentMethodFilter, dueDateFrom, dueDateTo, valueSort, hidePaid]);

  // O total exibido nunca reflete "ocultar pagos": é só uma lente sobre o que falta pagar.
  const visibleTotal = useMemo(
    () => applyCommonFilters(grouped).reduce((s, g) => s + g.subtotal, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grouped, query, paymentMethodFilter, dueDateFrom, dueDateTo]
  );

  // Mini-barras do resumo: as maiores categorias em ordem crescente.
  const bars = useMemo(() => {
    const top = grouped.slice(0, 6).map((g) => g.subtotal).reverse();
    const max = Math.max(1, ...top);
    return top.map((v) => Math.max(14, Math.round((v / max) * 100)));
  }, [grouped]);

  const toggleGroup = (name) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const paymentOptions = [
    { value: "", label: "Todas as formas" },
    ...allPaymentMethods(extraPaymentMethods).map((p) => ({ value: p, label: p })),
    { value: PAYMENT_METHOD_FALLBACK, label: PAYMENT_METHOD_FALLBACK },
  ];

  const empty = grouped.length === 0;

  const renderRows = (items, moveFor, meta) =>
    items.map((e, idx) => (
      <ExpenseRow
        key={e.id}
        e={e}
        meta={meta}
        selecting={selecting}
        selected={isSelected(e.id)}
        onToggleSelect={() => onToggleSelect(e.id)}
        highlight={highlightId === e.id}
        onEdit={() => onEdit(e)}
        onDelete={() => onDelete(e)}
        onTogglePaid={() => onTogglePaid(e)}
        onMoveUp={!filtersActive && idx > 0 ? () => moveFor(e, "up") : undefined}
        onMoveDown={!filtersActive && idx < items.length - 1 ? () => moveFor(e, "down") : undefined}
      />
    ));

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle="Acompanhe e organize suas despesas do mês"
        actions={<Button icon={Plus} size="lg" onClick={onAdd}>Novo gasto</Button>}
      />

      {selecting ? (
        <SelectionBanner />
      ) : (
        <Panel className="mb-4 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <SummaryLabel>{otherFiltersActive ? "Total encontrado" : "Total de gastos"}</SummaryLabel>
            <BigAmount className="mt-1">{fmt(otherFiltersActive ? visibleTotal : total)}</BigAmount>
            <SummaryMeta>
              {allItems.length} {allItems.length === 1 ? "lançamento" : "lançamentos"} · {pendingCount}{" "}
              {pendingCount === 1 ? "pendente" : "pendentes"}
            </SummaryMeta>
          </div>
          {bars.length > 0 && (
            <div className="hidden sm:flex items-end gap-2 h-[76px] shrink-0" aria-hidden="true">
              {bars.map((h, i) => (
                <span key={i} className="w-[13px] rounded-[5px]" style={{ height: `${h}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
              ))}
            </div>
          )}
        </Panel>
      )}

      {!empty && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar gasto…" className="flex-1 min-w-[220px]" />
          <span className="hidden lg:block h-8 w-px bg-line mx-1" />
          <Switch checked={hidePaid} onChange={setHidePaid} label="Ocultar pagos" />
          <SelectMenu
            icon={CreditCard}
            label="Forma de pagamento"
            value={paymentMethodFilter}
            options={paymentOptions}
            onChange={setPaymentMethodFilter}
            active={paymentMethodFilter !== ""}
          />
          <Popover
            panelClassName="w-72 p-4"
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className={
                  "h-11 inline-flex items-center gap-2 rounded-xl border px-3.5 text-[13px] sm:text-[14px] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
                  (dueActive ? "border-champagne bg-tint-gold text-ink" : "border-line bg-surface text-ink hover:border-muted/50")
                }
              >
                <CalendarDays size={17} className="text-muted" /> Vencimento <ChevronDown size={16} className="text-muted" />
              </button>
            )}
          >
            {({ close }) => (
              <div className="px-4 py-2 space-y-3">
                <label className="block text-[13px] text-muted">
                  De
                  <div className="mt-1">
                    <DateInput value={dueDateFrom} onChange={setDueDateFrom} />
                  </div>
                </label>
                <label className="block text-[13px] text-muted">
                  Até
                  <div className="mt-1">
                    <DateInput value={dueDateTo} onChange={setDueDateTo} />
                  </div>
                </label>
                <div className="flex justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDueDateFrom("");
                      setDueDateTo("");
                    }}
                    className="text-[13px] text-muted hover:text-ink"
                  >
                    Limpar datas
                  </button>
                  <button type="button" onClick={close} className="text-[13px] font-medium text-gold hover:underline">
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </Popover>
          <SelectMenu
            icon={ArrowUpDown}
            label="Ordenar"
            value={valueSort}
            align="right"
            options={[
              { value: "none", label: "Ordem padrão" },
              { value: "desc", label: "Maior valor primeiro" },
              { value: "asc", label: "Menor valor primeiro" },
            ]}
            onChange={setValueSort}
            active={valueSort !== "none"}
          />
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="text-[13px] text-muted hover:text-ink px-2 py-1">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {empty ? (
        <Panel>
          <EmptyState
            icon={ReceiptText}
            title="Nenhum gasto neste mês"
            text="Adicione seu primeiro lançamento para acompanhar suas despesas."
            action={<Button icon={Plus} size="lg" onClick={onAdd}>Novo gasto</Button>}
          />
        </Panel>
      ) : filteredGrouped.length === 0 ? (
        <Panel className="text-center py-10">
          <p className="text-[15px] text-muted">Nenhum gasto encontrado com esses filtros.</p>
          <button type="button" onClick={clearFilters} className="mt-3 text-[14px] font-medium text-gold hover:underline">
            Limpar filtros
          </button>
        </Panel>
      ) : (
        <div className="space-y-4">
          {filteredGrouped.map((g) => {
            const isCollapsed = collapsed.has(g.name);
            const meta = { icon: g.icon, color: g.color };
            return (
              <Panel key={g.name} className="!p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-3 sm:px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name)}
                    aria-expanded={!isCollapsed}
                    aria-label={(isCollapsed ? "Expandir " : "Recolher ") + g.name}
                    className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-ink hover:bg-surface-2"
                  >
                    <ChevronDown size={20} className={"transition-transform " + (isCollapsed ? "-rotate-90" : "")} />
                  </button>
                  <IconBubble icon={g.icon} color={g.color} />
                  <h3 className="font-display text-[19px] sm:text-[21px] text-heading flex-1 min-w-0 truncate">{g.name}</h3>
                  <Meter value={g.subtotal} max={total} color={g.color} className="hidden sm:block w-28 lg:w-32" />
                  <span className="font-display text-[17px] sm:text-[19px] text-heading tabular-nums shrink-0">{fmt(g.subtotal)}</span>
                </div>
                {!isCollapsed && (
                  <div className="px-2 sm:px-4 pb-2">
                    {g.name === CARTOES_CATEGORY
                      ? groupByPaymentMethod(g.items, valueSort).map((pm) => {
                          const pmMeta = paymentMethodMeta(pm.name);
                          const PmIcon = pmMeta.icon;
                          return (
                            <div key={pm.name} className="mb-2">
                              <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[14px]">
                                <PmIcon size={16} style={{ color: pmMeta.color }} />
                                <span className="text-ink">{pm.name}</span>
                                <span className="text-muted">· subtotal {fmt(pm.subtotal)}</span>
                              </div>
                              {renderRows(pm.items, (e, dir) => onMovePaymentMethod(g.name, pm.name, e.id, dir), meta)}
                            </div>
                          );
                        })
                      : renderRows(g.items, (e, dir) => onMove(e.category, e.id, dir), meta)}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
