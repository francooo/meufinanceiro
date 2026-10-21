/* Peças das telas de lista compartilhadas entre abas. */
import { Calculator, Search, X } from "lucide-react";
import { Panel } from "../ui/core.jsx";

// Faixa do modo "Somar itens" (somar-itens.jpg): ocupa o lugar do resumo.
export function SelectionBanner({ text = "Selecione os lançamentos que deseja somar" }) {
  return (
    <Panel className="!p-3 sm:!p-3.5 mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
      <span className="inline-flex items-center gap-2.5 rounded-xl bg-forest-2 text-white px-4 py-2.5 text-[15px] font-medium">
        <Calculator size={19} /> Somar itens
      </span>
      <span className="hidden sm:block h-8 w-px bg-line" />
      <span className="text-[14px] text-muted">{text}</span>
    </Panel>
  );
}

export function SearchField({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={"relative " + className}>
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-line bg-surface pl-11 pr-10 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-champagne focus:ring-2 focus:ring-champagne/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// Número grande serifado dos resumos.
export function BigAmount({ children, tone = "ink", className = "" }) {
  const color = tone === "coral" ? "text-coral" : tone === "green" ? "text-positive" : "text-heading";
  return (
    <p className={"font-display font-semibold text-[36px] sm:text-[46px] leading-none tabular-nums " + color + " " + className}>
      {children}
    </p>
  );
}

export function SummaryLabel({ children }) {
  return <p className="font-display text-[17px] sm:text-[19px] text-ink">{children}</p>;
}

export function SummaryMeta({ children }) {
  return <p className="mt-2 font-display text-[15px] sm:text-[17px] text-muted">{children}</p>;
}
