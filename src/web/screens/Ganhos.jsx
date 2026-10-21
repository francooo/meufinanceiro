/* Lançamentos — Ganhos (references/ganhos.jpg). */
import { useMemo, useState } from "react";
import { Briefcase, Filter, HandCoins, Pencil, Plus, Repeat, Trash2, UtensilsCrossed, Wallet } from "lucide-react";
import { ActionMenu, Button, Checkbox, Chip, EmptyState, IconAction, IconBubble, PageHeader, Panel, PanelTitle, SelectMenu } from "../ui/core.jsx";
import { fmt, formatDayMonth, monthLabel, sumValues } from "../lib/format.js";
import { BigAmount, SearchField, SelectionBanner, SummaryLabel, SummaryMeta } from "./shared.jsx";

const originOf = (i) => (i.cltPjIncome ? "cltPj" : i.voucherIncome ? "va" : "other");
const ORIGIN_ICON = { cltPj: Briefcase, va: UtensilsCrossed, other: HandCoins };

function SummaryStat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 min-w-0">
      <IconBubble icon={icon} />
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="font-display text-[22px] sm:text-[26px] text-heading tabular-nums truncate">{fmt(value)}</p>
      </div>
    </div>
  );
}

export default function Ganhos({ incomes, total, month, onAdd, onEdit, onDelete, selecting, isSelected, onToggleSelect }) {
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("all");
  const query = search.trim().toLowerCase();
  const filtering = query !== "" || origin !== "all";

  const filtered = useMemo(
    () =>
      incomes.filter(
        (i) =>
          (!query || i.source.toLowerCase().includes(query) || (i.note || "").toLowerCase().includes(query)) &&
          (origin === "all" || originOf(i) === origin)
      ),
    [incomes, query, origin]
  );

  const cltPjTotal = useMemo(() => sumValues(incomes.filter((i) => i.cltPjIncome)), [incomes]);
  const vaTotal = useMemo(() => sumValues(incomes.filter((i) => i.voucherIncome)), [incomes]);

  return (
    <div>
      <PageHeader
        title="Ganhos"
        subtitle="Acompanhe suas entradas do mês"
        actions={<Button icon={Plus} size="lg" onClick={onAdd}>Novo ganho</Button>}
      />

      {selecting ? (
        <SelectionBanner />
      ) : (
        <Panel className="mb-4 grid gap-6 md:grid-cols-[1.4fr_auto_1fr_auto_1fr] md:items-center">
          <div className="min-w-0">
            <SummaryLabel>{filtering ? "Total encontrado" : "Total de ganhos"}</SummaryLabel>
            <BigAmount className="mt-1">{fmt(filtering ? sumValues(filtered) : total)}</BigAmount>
            <SummaryMeta>
              {incomes.length} {incomes.length === 1 ? "lançamento" : "lançamentos"} · {monthLabel(month)}
            </SummaryMeta>
          </div>
          <span className="hidden md:block h-14 w-px bg-line" />
          <SummaryStat icon={Briefcase} label="CLT/PJ" value={cltPjTotal} />
          <span className="hidden md:block h-14 w-px bg-line" />
          <SummaryStat icon={UtensilsCrossed} label="Vale-alimentação" value={vaTotal} />
        </Panel>
      )}

      {incomes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar ganho…" className="flex-1 min-w-[220px] max-w-2xl" />
          <SelectMenu
            icon={Filter}
            label="Origem: Todas"
            value={origin}
            align="right"
            active={origin !== "all"}
            onChange={setOrigin}
            options={[
              { value: "all", label: "Origem: Todas" },
              { value: "cltPj", label: "Origem: CLT/PJ" },
              { value: "va", label: "Origem: Vale-alimentação" },
              { value: "other", label: "Origem: Outros" },
            ]}
          />
        </div>
      )}

      {incomes.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Wallet}
            title="Nenhum ganho neste mês"
            text="Registre suas entradas para acompanhar a sobra do mês."
            action={<Button icon={Plus} size="lg" onClick={onAdd}>Novo ganho</Button>}
          />
        </Panel>
      ) : (
        <Panel>
          <PanelTitle>Lançamentos do mês</PanelTitle>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-muted">Nenhum ganho encontrado.</p>
          ) : (
            <div role="table" aria-label="Ganhos do mês">
              <div role="row" className="hidden md:grid grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_1fr_88px] gap-4 px-1 pb-3 border-b border-line text-[14px] text-muted">
                <span role="columnheader">Descrição</span>
                <span role="columnheader">Origem</span>
                <span role="columnheader">Data</span>
                <span role="columnheader">Valor</span>
                <span />
              </div>
              {filtered.map((i) => {
                const o = originOf(i);
                return (
                  <div
                    role="row"
                    key={i.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_1fr_88px] items-center gap-x-4 gap-y-2 px-1 py-3.5 border-b border-line last:border-b-0"
                  >
                    <div role="cell" className="flex items-center gap-3 min-w-0">
                      {selecting && <Checkbox checked={isSelected(i.id)} onChange={() => onToggleSelect(i.id)} label={`Selecionar ${i.source}`} />}
                      <IconBubble icon={ORIGIN_ICON[o]} />
                      <div className="min-w-0">
                        <p className="font-display text-[16px] sm:text-[17px] text-ink truncate flex items-center gap-1.5">
                          <span className="truncate">{i.source}</span>
                          {i.recurrent && <Repeat size={13} className="text-muted shrink-0" aria-label="Recorrente" />}
                        </p>
                        {i.note && <p className="text-[13px] text-muted truncate">{i.note}</p>}
                      </div>
                    </div>
                    <div role="cell" className="hidden md:flex gap-1.5">
                      {i.cltPjIncome && <Chip>CLT/PJ</Chip>}
                      {i.voucherIncome && <Chip>VA</Chip>}
                      {o === "other" && <Chip tone="neutral">Outros</Chip>}
                    </div>
                    <span role="cell" className="hidden md:block text-[15px] text-muted tabular-nums">
                      {i.receiptDate ? formatDayMonth(i.receiptDate) : "—"}
                    </span>
                    <span role="cell" className="text-right md:text-left font-display text-[16px] sm:text-[18px] text-positive tabular-nums">
                      + {fmt(i.value)}
                    </span>
                    <div role="cell" className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                      <span className="md:hidden mr-auto text-[13px] text-muted">
                        {[i.cltPjIncome && "CLT/PJ", i.voucherIncome && "VA", i.receiptDate && formatDayMonth(i.receiptDate)].filter(Boolean).join(" · ")}
                      </span>
                      <IconAction icon={Pencil} label="Editar" onClick={() => onEdit(i)} />
                      <ActionMenu items={[{ label: "Excluir", icon: Trash2, onClick: () => onDelete(i), danger: true }]} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
