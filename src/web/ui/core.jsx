/* Peças visuais básicas do UI kit. Só cores de token (src/index.css), então o
   modo escuro funciona sem classes extras. */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MoreHorizontal, X } from "lucide-react";

export function Panel({ children, className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag className={"rounded-[18px] bg-surface border border-line shadow-card p-5 sm:p-6 " + className} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="font-display font-semibold text-[21px] sm:text-[23px] leading-tight text-heading">{children}</h2>
      {action}
    </div>
  );
}

// Título serifado + subtítulo à esquerda; ações (botões) à direita, como no kit.
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mt-7 sm:mt-9 mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-[34px] sm:text-[44px] leading-[1.05] text-heading">{title}</h1>
        {subtitle && <p className="mt-1.5 font-display text-[17px] sm:text-[21px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-forest-2 text-white border border-forest-2 hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  soft: "bg-surface-2 text-ink border border-line hover:border-champagne/60",
  danger: "bg-coral text-white border border-coral hover:opacity-90",
  ghost: "text-ink hover:bg-surface-2 border border-transparent",
};

export function Button({ variant = "primary", size = "md", icon: Icon, children, className = "", ...rest }) {
  const sizes = size === "lg" ? "px-5 py-3 text-[15px]" : size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm";
  return (
    <button
      type="button"
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 disabled:opacity-40 disabled:cursor-not-allowed " +
        BUTTON_VARIANTS[variant] + " " + sizes + " " + className
      }
      {...rest}
    >
      {Icon && <Icon size={size === "sm" ? 15 : 18} />}
      {children}
    </button>
  );
}

const BUBBLE_TONES = {
  green: "bg-tint-green text-positive",
  coral: "bg-tint-coral text-coral",
  gold: "bg-tint-gold text-gold",
  neutral: "bg-surface-2 text-muted",
};

// Ícone em círculo de tom claro (as "bolhas" das listas do kit). `color` usa a cor
// da categoria em vez de um tom fixo.
export function IconBubble({ icon: Icon, tone = "green", color, size = "md", className = "" }) {
  const dims = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "lg" ? 30 : size === "sm" ? 17 : 20;
  return (
    <span
      className={"shrink-0 rounded-full flex items-center justify-center " + dims + " " + (color ? "" : BUBBLE_TONES[tone]) + " " + className}
      style={color ? { background: color + "1F", color } : undefined}
    >
      {Icon && <Icon size={iconSize} />}
    </span>
  );
}

const CHIP_TONES = {
  green: "bg-tint-green text-positive",
  coral: "bg-tint-coral text-coral",
  gold: "bg-tint-gold text-gold",
  neutral: "bg-surface-2 text-muted",
};

export function Chip({ children, tone = "green", className = "" }) {
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap " + CHIP_TONES[tone] + " " + className}>
      {children}
    </span>
  );
}

export function StatusPill({ paid, paidLabel = "Pago", pendingLabel = "Pendente" }) {
  return paid ? (
    <Chip tone="green">
      <span className="h-4 w-4 rounded-full bg-positive text-surface flex items-center justify-center">
        <Check size={11} strokeWidth={3} />
      </span>
      {paidLabel}
    </Chip>
  ) : (
    <Chip tone="coral">{pendingLabel}</Chip>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-[14px] text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 rounded-full"
    >
      <span className={"relative h-6 w-11 rounded-full transition-colors " + (checked ? "bg-forest-2" : "bg-line")}>
        <span
          className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (checked ? "left-[22px]" : "left-0.5")}
        />
      </span>
      {label}
    </button>
  );
}

// Caixa de seleção do kit (Somar itens, comprado nas listas).
export function Checkbox({ checked, onChange, label, className = "" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!checked}
      aria-label={label}
      onClick={onChange}
      className={
        "h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
        (checked ? "bg-forest-2 border-forest-2 text-white" : "bg-surface border-line text-transparent hover:border-muted") +
        " " + className
      }
    >
      <Check size={15} strokeWidth={3} />
    </button>
  );
}

/* ---------- menus suspensos ---------- */
function useClickOutside(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return ref;
}

// Botão que abre um painel (filtros). `children` recebe { close }.
export function Popover({ trigger, children, align = "left", panelClassName = "w-64" }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, setOpen);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={
            "absolute top-full mt-2 z-40 rounded-2xl bg-surface border border-line shadow-lg py-2 " +
            (align === "right" ? "right-0 " : "left-0 ") + panelClassName
          }
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

// Filtro em menu suspenso (Forma de pagamento, Ordenar, Origem…).
export function SelectMenu({ icon: Icon, label, value, options, onChange, align = "left", active }) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      align={align}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={
            "h-11 inline-flex items-center gap-2 rounded-xl border px-3.5 text-[13px] sm:text-[14px] whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
            (active ? "border-champagne bg-tint-gold text-ink" : "border-line bg-surface text-ink hover:border-muted/50")
          }
        >
          {Icon && <Icon size={17} className="text-muted" />}
          <span className="max-w-[180px] truncate">{active && current ? current.label : label}</span>
          <ChevronDown size={16} className="text-muted" />
        </button>
      )}
    >
      {({ close }) => (
        <div role="listbox" className="max-h-72 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                close();
              }}
              className={"w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-2 " + (o.value === value ? "font-semibold text-ink" : "text-ink/80")}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={15} className="text-positive shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

// "…" com as ações secundárias de uma linha.
export function ActionMenu({ items, label = "Mais ações" }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <Popover
      align="right"
      panelClassName="w-56"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60"
        >
          <MoreHorizontal size={20} />
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu">
          {visible.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  close();
                  it.onClick();
                }}
                className={
                  "w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent " +
                  (it.danger ? "text-coral" : "text-ink")
                }
              >
                {Icon && <Icon size={16} />}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

// Botão de ação pequeno das linhas (✓ marcar pago, ✎ editar).
export function IconAction({ icon: Icon, label, onClick, active, tone = "neutral" }) {
  const activeCls = tone === "green" ? "text-positive" : "text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 " +
        (active ? activeCls : "text-muted hover:text-ink")
      }
    >
      <Icon size={19} />
    </button>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 sm:py-16 px-4">
      {Icon && (
        <span className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-tint-green text-positive flex items-center justify-center mb-6">
          <Icon size={40} strokeWidth={1.6} />
        </span>
      )}
      <h3 className="font-display font-semibold text-[24px] sm:text-[30px] text-heading">{title}</h3>
      {text && <p className="mt-2 font-display text-[16px] sm:text-[19px] text-muted max-w-md">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={"block rounded-lg mf-skeleton " + className} />;
}

// Aviso temporário com ação (ex.: "Gasto marcado como pago · Desfazer").
export function Toast({ message, actionLabel, onAction, onClose }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] bottom-28 right-4 left-4 sm:left-auto sm:right-8 sm:bottom-[104px]flex items-center gap-3 rounded-2xl bg-forest text-white px-4 py-3.5 shadow-2xl"
    >
      <span className="h-7 w-7 shrink-0 rounded-full bg-white/15 text-mint flex items-center justify-center">
        <Check size={16} strokeWidth={3} />
      </span>
      <span className="text-[14px] flex-1 sm:flex-none">{message}</span>
      {actionLabel && (
        <>
          <span className="h-5 w-px bg-white/20" />
          <button type="button" onClick={onAction} className="text-[14px] font-medium text-mint hover:text-white focus:outline-none focus-visible:underline">
            {actionLabel}
          </button>
        </>
      )}
      <button type="button" onClick={onClose} aria-label="Fechar aviso" className="h-7 w-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10">
        <X size={16} />
      </button>
    </div>
  );
}

// Barra de progresso fina das listas (fatia da categoria, credor).
export function Meter({ value, max, color = "rgb(var(--coral))", className = "" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span className={"block h-2 rounded-full bg-surface-2 overflow-hidden " + className} aria-hidden="true">
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </span>
  );
}
