/* Cartões — Saldos (cartoes-saldos.jpg) e Fechamentos (cartoes-fechamentos.jpg). */
import { CreditCard, Info, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ActionMenu, Button, EmptyState, IconAction, IconBubble, PageHeader, Panel, PanelTitle } from "../ui/core.jsx";
import { paymentMethodMeta } from "../lib/catalog.jsx";
import { fmt, formatDateBR, formatDayMonth, monthLabel, monthName, sumValues } from "../lib/format.js";
import { BigAmount, SummaryLabel } from "./shared.jsx";

const CARD_STYLES = [
  "linear-gradient(135deg,#0c654a 0%,#082f26 80%)",
  "linear-gradient(135deg,#253235 0%,#11191a 85%)",
];

// Cartão "físico" do kit: nome, final e o chip dourado.
function BankCard({ name, lastDigits, styleIndex }) {
  const meta = paymentMethodMeta(name);
  const Brand = meta.icon;
  return (
    <div
      className="relative overflow-hidden rounded-[18px] p-5 sm:p-6 min-h-[150px] text-white shadow-[0_14px_30px_rgba(11,48,37,0.18)]"
      style={{ background: CARD_STYLES[styleIndex % CARD_STYLES.length] }}
    >
      <span aria-hidden="true" className="absolute -right-12 top-5 h-52 w-52 rounded-full border border-white/10" />
      <span aria-hidden="true" className="absolute right-6 top-6 h-7 w-9 rounded-md" style={{ background: "linear-gradient(135deg,#d9ca9a,#a89b72)" }} />
      <p className="relative font-display text-[21px] sm:text-[23px] pr-14 truncate">{name}</p>
      <p className="relative mt-5 font-display text-[20px] tracking-[0.14em] tabular-nums">
        {lastDigits ? `•••• ${lastDigits}` : <span className="text-white/45 text-[15px] tracking-normal">Final não informado</span>}
      </p>
      <span className="absolute right-6 bottom-5 flex items-center gap-2 text-white/80">
        <Brand size={18} />
      </span>
    </div>
  );
}

function CardStat({ label, value, sub, tone, title }) {
  const color = tone === "coral" ? "text-coral" : tone === "green" ? "text-positive" : "text-heading";
  return (
    <div className="min-w-0 sm:pr-3 sm:border-r border-line last:border-r-0 py-2 sm:py-0" title={title}>
      <p className="text-[13px] text-muted flex items-center gap-1">
        {label} {title && <Info size={13} className="text-muted" />}
      </p>
      <p className={"mt-1 font-display text-[20px] sm:text-[22px] tabular-nums truncate " + color}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

export function CartoesSaldos({ cards, unregistered, month, canAdd, onAdd, onEdit, onUpdateBalance, onDelete }) {
  const totalRestante = cards.reduce((s, c) => s + c.remaining, 0);

  return (
    <div>
      <PageHeader
        title="Cartões"
        subtitle="Acompanhe saldos e gastos por cartão"
        actions={
          <Button icon={Plus} size="lg" onClick={() => onAdd()} disabled={!canAdd} title={canAdd ? undefined : "Todas as formas de pagamento já têm saldo cadastrado."}>
            Novo cartão
          </Button>
        }
      />

      {cards.length > 0 && (
        <Panel className="mb-4 flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <SummaryLabel>
              <span className="inline-flex items-center gap-2">
                Sobra somada em {monthLabel(month)}
                <Info size={16} className="text-muted" aria-label="Sobra = saldo registrado − gastos do mês" />
              </span>
            </SummaryLabel>
            <BigAmount className="mt-1" tone={totalRestante < 0 ? "coral" : "ink"}>{fmt(totalRestante)}</BigAmount>
            <p className="mt-2 text-[14px] sm:text-[15px] text-muted">
              Sobra = saldo registrado − gastos do mês. Compras parceladas contam pelo valor total.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-line max-w-[260px]">
            <IconBubble icon={CreditCard} size="lg" />
            <p className="text-[14px] text-muted">Mais controle para suas compras, em um só lugar.</p>
          </div>
        </Panel>
      )}

      {cards.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            text="Registre o saldo disponível de um cartão para acompanhar quanto sobra no mês."
            action={<Button icon={Plus} size="lg" onClick={() => onAdd()} disabled={!canAdd}>Novo cartão</Button>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((c, idx) => {
            const skipped = c.scope === "before";
            return (
              <Panel key={c.id} className="flex flex-col">
                <BankCard name={c.paymentMethod} lastDigits={c.lastDigits} styleIndex={idx} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 my-5">
                  <CardStat label="Saldo registrado" value={fmt(c.balance)} sub={`Registrado em ${formatDayMonth(c.referenceDate)}`} />
                  <CardStat
                    label="Gastos do mês"
                    value={skipped ? "—" : fmt(c.spent)}
                    title="Gastos do mês com esta forma de pagamento; compras parceladas entram pelo valor total."
                  />
                  <CardStat
                    label="Sobra"
                    value={(c.remaining < 0 ? "− " : "") + fmt(Math.abs(c.remaining))}
                    tone={c.remaining < 0 ? "coral" : "green"}
                    title="Saldo registrado menos os gastos do mês."
                  />
                </div>

                {/* avisos de escopo do saldo (os mesmos da versão anterior) */}
                {(
                  <div className="space-y-1.5 mb-4 text-[12px] sm:text-[13px]">
                    {c.note && <p className="text-muted">{c.note}</p>}
                    {!skipped && c.upfrontExtra > 0 && (
                      <p className="text-muted">
                        Inclui o valor total de {c.upfrontCount} {c.upfrontCount === 1 ? "compra parcelada" : "compras parceladas"} — o limite do cartão cai de uma vez.
                      </p>
                    )}
                    {skipped && (
                      <p className="text-gold">
                        Saldo registrado em {formatDateBR(c.referenceDate)}, depois de {monthLabel(month)} — os gastos deste mês já estavam descontados.
                      </p>
                    )}
                    {c.scope === "same" && (
                      <p className="text-gold">Pode incluir gastos anteriores a {formatDateBR(c.referenceDate)}, já descontados do saldo.</p>
                    )}
                    {c.scope === "after" && (
                      <p className="text-gold">
                        Saldo anotado em {formatDateBR(c.referenceDate)}, antes de {monthLabel(month)}. Os gastos dos meses entre uma coisa e outra não estão descontados.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2">
                  <Button variant="soft" icon={RefreshCw} size="lg" className="flex-1" onClick={() => onUpdateBalance(c)}>
                    Atualizar saldo
                  </Button>
                  <ActionMenu
                    label={`Ações de ${c.paymentMethod}`}
                    items={[
                      { label: "Editar cartão", icon: Pencil, onClick: () => onEdit(c) },
                      { label: "Excluir", icon: Trash2, onClick: () => onDelete(c), danger: true },
                    ]}
                  />
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {unregistered.length > 0 && (
        <Panel className="mt-4">
          <PanelTitle>Sem saldo cadastrado</PanelTitle>
          <p className="-mt-2 mb-3 text-[14px] text-muted">
            Estas formas de pagamento tiveram gastos em {monthLabel(month)} e não entram na conta acima.
          </p>
          <div>
            {unregistered.map((u) => {
              const meta = paymentMethodMeta(u.name);
              return (
                <div key={u.name} className="flex flex-wrap items-center gap-3 py-3 border-t border-line first:border-t-0">
                  <IconBubble icon={meta.icon} color={meta.color} size="sm" />
                  <span className="flex-1 min-w-0 truncate text-[15px] text-ink">{u.name}</span>
                  <span className="font-display text-[16px] text-muted tabular-nums">{fmt(u.value)}</span>
                  <Button variant="secondary" size="sm" onClick={() => onAdd(u.name)}>
                    Cadastrar saldo
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

export function CartoesFechamentos({ items, month, onAdd, onEdit, onDelete }) {
  const total = sumValues(items);
  return (
    <div>
      <PageHeader
        title="Fechamentos de cartão"
        subtitle="Planeje os valores a pagar em cada cartão"
        actions={<Button icon={Plus} size="lg" onClick={onAdd}>Novo fechamento</Button>}
      />

      <Panel className="mb-4 flex items-center gap-5 sm:gap-7">
        <IconBubble icon={CreditCard} size="lg" />
        <div className="min-w-0">
          <p className="text-[15px] sm:text-[17px] text-positive">Total a pagar em {monthLabel(month)}</p>
          <BigAmount className="mt-1 !text-forest-2 dark:!text-heading">{fmt(total)}</BigAmount>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Fechamentos do mês</PanelTitle>
        {items.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum fechamento neste mês"
            text="Registre o valor total a pagar de cada cartão."
            action={<Button icon={Plus} onClick={onAdd}>Novo fechamento</Button>}
          />
        ) : (
          <div className="border-t border-line">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 sm:gap-4 py-4 border-b border-line">
                <IconBubble icon={CreditCard} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] sm:text-[19px] text-ink truncate">{it.cardName}</p>
                  <p className="text-[13px] sm:text-[14px] text-muted">Fechamento de {monthName(month)}</p>
                </div>
                <span className="font-display text-[17px] sm:text-[21px] text-heading tabular-nums sm:pr-4 sm:border-r border-line">{fmt(it.value)}</span>
                <IconAction icon={Pencil} label="Editar" onClick={() => onEdit(it)} />
                <ActionMenu items={[{ label: "Excluir", icon: Trash2, onClick: () => onDelete(it), danger: true }]} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 flex items-center gap-2.5 text-[14px] text-muted">
          <Info size={18} className="text-gold shrink-0" /> Registre aqui o valor total a pagar de cada cartão neste mês.
        </p>
      </Panel>
    </div>
  );
}
