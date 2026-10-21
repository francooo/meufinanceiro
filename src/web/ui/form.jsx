/* Modal e campos de formulário do UI kit. */
import { forwardRef, useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown, CreditCard, Plus, X } from "lucide-react";
import { Button, Popover } from "./core.jsx";

const INPUT =
  "w-full rounded-xl border border-line bg-surface text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:border-champagne focus:ring-2 focus:ring-champagne/25";

// Centralizado no desktop; folha que sobe de baixo no celular (como no kit).
export function Modal({ title, subtitle, onClose, children, footer, size = "md" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const width = size === "sm" ? "sm:max-w-[520px]" : size === "lg" ? "sm:max-w-[720px]" : "sm:max-w-[640px]";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-[rgba(12,24,20,0.45)] backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={"w-full bg-surface border border-line shadow-2xl max-h-[92vh] flex flex-col rounded-t-[22px] sm:rounded-[20px] " + width}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-8 pt-6 sm:pt-7">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-[26px] sm:text-[31px] leading-tight text-heading">{title}</h2>
            {subtitle && <p className="mt-1 font-display text-[15px] sm:text-[16px] text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-10 w-10 shrink-0 rounded-full border border-line text-ink flex items-center justify-center hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60"
          >
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-8 py-5 flex-1 space-y-5">{children}</div>
        {footer && (
          <div className="px-5 sm:px-8 py-4 border-t border-line flex flex-wrap justify-end gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalFooter({ onCancel, onSubmit, submitLabel = "Salvar", disabled }) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} className="min-w-[110px]">
        Cancelar
      </Button>
      <Button variant="primary" onClick={onSubmit} disabled={disabled} className="min-w-[140px]">
        {submitLabel}
      </Button>
    </>
  );
}

export function Field({ label, optional, hint, error, children, className = "" }) {
  return (
    <div className={"block " + className}>
      {label && (
        <span className="block mb-1.5 text-[14px] font-medium text-ink font-display">
          {label} {optional && <span className="font-brand font-normal text-muted text-[13px]">(opcional)</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block mt-1.5 text-[12px] text-coral">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[12px] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ icon: Icon, className = "", ...rest }, ref) {
  if (!Icon) return <input ref={ref} className={INPUT + " h-11 px-3.5 text-[15px] " + className} {...rest} />;
  return (
    <div className="relative">
      <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input ref={ref} className={INPUT + " h-11 pl-11 pr-3.5 text-[15px] " + className} {...rest} />
    </div>
  );
});

// Valor em reais. Texto livre com vírgula ("1.234,56"); quem salva converte com
// parseAmount. `big` é o campo grande serifado do topo dos modais de lançamento.
export const MoneyInput = forwardRef(function MoneyInput({ value, onChange, big, invalid, placeholder = "0,00", ...rest }, ref) {
  return (
    <div className="relative">
      <span
        className={
          "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink " +
          (big ? "font-display text-[18px]" : "text-[15px] text-muted")
        }
      >
        R$
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={
          INPUT +
          (big ? " h-16 pl-14 pr-4 font-display text-[30px] border-champagne/70 " : " h-11 pl-11 pr-3.5 text-[15px] tabular-nums ") +
          (invalid ? " border-coral focus:border-coral focus:ring-coral/20" : "")
        }
        {...rest}
      />
    </div>
  );
});

// Data nativa (o navegador já mostra dd/mm/aaaa em pt-BR e abre o calendário).
export function DateInput({ value, onChange, ...rest }) {
  return (
    <div className="relative">
      <CalendarDays size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT + " h-11 pl-11 pr-3 text-[15px] tabular-nums [color-scheme:inherit]"}
        {...rest}
      />
    </div>
  );
}

export function TextArea({ className = "", ...rest }) {
  return <textarea rows={3} className={INPUT + " px-3.5 py-3 text-[15px] resize-y min-h-[84px] " + className} {...rest} />;
}

// Cartões de opção (Origem do dinheiro, Tipo de dívida). `multiple` aceita
// nenhum, um ou vários — VA e CLT/PJ de um gasto são independentes.
export function OptionCards({ options, value, onChange, multiple, columns = 2 }) {
  const isOn = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (!multiple) return onChange(v);
    const cur = value || [];
    onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const grid = columns === 3 ? "sm:grid-cols-3" : columns === 4 ? "sm:grid-cols-4" : "sm:grid-cols-2";
  // Com 3+ colunas o cartão fica empilhado (ícone em cima, nome embaixo), como o
  // "Tipo de dívida" do kit: lado a lado, "Financiamento" não cabia.
  const stacked = columns >= 3;
  return (
    <div className={"grid gap-3 " + (stacked ? "grid-cols-2 " : "grid-cols-1 ") + grid} role={multiple ? "group" : "radiogroup"}>
      {options.map((o) => {
        const on = isOn(o.value);
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(o.value)}
            className={
              "relative flex rounded-2xl border p-3.5 text-left transition-colors " +
              (stacked ? "flex-col items-start gap-2.5 " : "items-center gap-3 pr-9 ") +
              " focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
              (on ? "border-champagne bg-tint-gold" : "border-line bg-surface hover:border-muted/50")
            }
          >
            {Icon && (
              <span className={"h-11 w-11 shrink-0 rounded-full flex items-center justify-center " + (on ? "bg-surface text-gold" : "bg-tint-green text-positive")}>
                <Icon size={20} />
              </span>
            )}
            <span className={"min-w-0 " + (stacked ? "w-full" : "flex-1")}>
              <span className="block font-display text-[16px] text-ink leading-tight break-words">{o.label}</span>
              {o.description && <span className="block mt-0.5 text-[12px] text-muted leading-snug">{o.description}</span>}
            </span>
            <span
              aria-hidden="true"
              className={
                "absolute right-3 top-3 h-5 w-5 flex items-center justify-center border " +
                (multiple ? "rounded-md " : "rounded-full ") +
                (on ? "border-champagne bg-champagne text-white" : "border-line bg-surface text-transparent")
              }
            >
              <Check size={12} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Escolha única em linha (Recorrência: não se repete / recorrente / parcelado).
export function Segmented({ options, value, onChange }) {
  return (
    <div className={"grid grid-cols-1 gap-3 " + (options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")} role="radiogroup">
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              "h-12 inline-flex items-center justify-center gap-2.5 rounded-xl border text-[14px] text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
              (on ? "border-champagne bg-tint-gold font-medium" : "border-line bg-surface hover:border-muted/50")
            }
          >
            {Icon && <Icon size={18} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Categoria em chips + "Criar categoria". Categoria é texto livre: o modo
// "criar" troca os chips por um campo de texto.
export function CategoryChips({ options, value, onChange, createLabel = "Criar categoria", placeholder = "Nome da nova categoria" }) {
  const known = options.some((o) => o.name === value);
  const [creating, setCreating] = useState(() => !!value && !known);
  if (creating) {
    return (
      <div className="flex gap-2">
        <TextInput autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            onChange(known ? value : options[0]?.name || "");
          }}
          aria-label="Cancelar nova categoria"
          className="h-11 w-11 shrink-0 rounded-xl border border-line text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center"
        >
          <X size={17} />
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 max-h-[132px] overflow-y-auto pr-1" role="radiogroup">
        {options.map((o) => {
          const on = o.name === value;
          const Icon = o.icon;
          return (
            <button
              key={o.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.name)}
              className={
                "h-10 inline-flex items-center gap-2 rounded-xl border px-3 text-[13px] text-ink whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
                (on ? "border-champagne bg-tint-gold font-medium" : "border-line bg-surface hover:border-muted/50")
              }
            >
              {Icon && <Icon size={16} style={{ color: on ? undefined : o.color }} />}
              {o.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          setCreating(true);
          onChange("");
        }}
        className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-gold hover:underline focus:outline-none focus-visible:underline"
      >
        <Plus size={15} /> {createLabel}
      </button>
    </div>
  );
}

// Forma de pagamento: lista com ícone de marca + "Adicionar forma" (texto livre).
export function PaymentSelect({ options, value, onChange, metaOf, noneLabel = "Selecionar forma de pagamento" }) {
  const known = !value || options.includes(value);
  const [creating, setCreating] = useState(() => !known);
  if (creating) {
    return (
      <div>
        <div className="flex gap-2">
          <TextInput autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="Nome da forma de pagamento" />
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              onChange(options.includes(value) ? value : "");
            }}
            aria-label="Cancelar nova forma de pagamento"
            className="h-11 w-11 shrink-0 rounded-xl border border-line text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    );
  }
  const meta = value ? metaOf(value) : null;
  const CurIcon = meta?.icon;
  return (
    <div>
      <Popover
        panelClassName="w-full min-w-[260px]"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={INPUT + " h-11 px-3.5 flex items-center gap-2.5 text-left text-[15px]"}
          >
            {CurIcon ? <CurIcon size={18} style={{ color: meta.color }} /> : <CreditCard size={18} className="text-muted" />}
            <span className={"flex-1 truncate " + (value ? "text-ink" : "text-muted")}>{value || noneLabel}</span>
            <ChevronDown size={17} className="text-muted" />
          </button>
        )}
      >
        {({ close }) => (
          <div role="listbox" className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2"
            >
              Nenhuma
            </button>
            {options.map((p) => {
              const m = metaOf(p);
              const I = m.icon;
              return (
                <button
                  key={p}
                  type="button"
                  role="option"
                  aria-selected={p === value}
                  onClick={() => {
                    onChange(p);
                    close();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
                >
                  <I size={16} style={{ color: m.color }} />
                  <span className="flex-1 truncate">{p}</span>
                  {p === value && <Check size={15} className="text-positive" />}
                </button>
              );
            })}
          </div>
        )}
      </Popover>
      <button
        type="button"
        onClick={() => {
          setCreating(true);
          onChange("");
        }}
        className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-gold hover:underline focus:outline-none focus-visible:underline"
      >
        <Plus size={15} /> Adicionar forma
      </button>
    </div>
  );
}

// Campos secundários recolhidos ("Mais opções").
export function MoreOptions({ children, label = "Mais opções", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-medium text-ink hover:bg-surface-2 rounded-2xl"
      >
        {label}
        <ChevronDown size={17} className={"text-muted transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>}
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Excluir", onCancel, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] text-muted">{message}</p>
    </Modal>
  );
}
