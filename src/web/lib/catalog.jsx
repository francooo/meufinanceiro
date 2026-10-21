/* Catálogos e regras de agrupamento compartilhados pela web (antes presos em
   meu-caixa.jsx). Espelho de mobile/src/core/catalog.js — mudou aqui, muda lá. */
import {
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone, Landmark, Car, CreditCard,
  Repeat, Gamepad2, Tag, Shirt, HandCoins, FileText, AlertTriangle,
} from "lucide-react";

export const CATS = [
  { name: "Moradia", color: "#2E7D6B", icon: Home },
  { name: "Educação", color: "#3B6EA5", icon: GraduationCap },
  { name: "Saúde", color: "#C65D7B", icon: HeartPulse },
  { name: "Casa / Utilidades", color: "#E8873C", icon: Lightbulb },
  { name: "Telefonia", color: "#1098AD", icon: Smartphone },
  { name: "Impostos", color: "#7A5AF8", icon: Landmark },
  { name: "Transporte", color: "#2F9E44", icon: Car },
  { name: "Cartões / Financeiro", color: "#D6493B", icon: CreditCard },
  { name: "Assinaturas / Serviços", color: "#B5892E", icon: Repeat },
  { name: "Lazer / Hobbies", color: "#E64980", icon: Gamepad2 },
];
export const FALLBACK = { color: "#64748B", icon: Tag };
export const catMeta = (n) => CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

export const CARTOES_CATEGORY = "Cartões / Financeiro";
export const PAYMENT_METHODS = ["Pix", "Cartão Nubank Fran", "Cartão Nubank Andrews", "Cartão Sams", "Cartão Renner"];
export const PAYMENT_METHOD_FALLBACK = "Sem forma de pagamento";

/* ícones de marca (fonte: simple-icons.org, cores oficiais das marcas) */
export function PixIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156" />
    </svg>
  );
}
export function NubankIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M7.2795 5.4336c-1.1815 0-2.1846.4628-2.9432 1.252h-.002c-.0541-.0022-.1074-.002-.162-.002-1.5436 0-2.9925.8835-3.699 2.2559-.3088.5996-.4234 1.2442-.459 1.9003-.0321.589 0 1.1863 0 1.7696v5.6523H3.184s.0022-2.784 0-5.1777c-.0014-1.6112-.0118-3.0471 0-3.3418.056-1.3937.4372-2.3053 1.1484-3.0508 2.3585.0018 3.8852 1.6091 3.9705 4.168.0196.5874.0254 3.7304.0254 3.7304v3.672h3.1678v-4.965c0-1.5007.0127-2.8006-.0918-3.6952-.292-2.5-1.821-4.168-4.1248-4.168zm8.3903.3008l-3.166.0039v4.9648c0 1.5009-.0127 2.8007.0919 3.6953.2921 2.5001 1.821 4.168 4.1248 4.168 1.1815 0 2.1846-.4628 2.9432-1.252.0003-.0003.0016.0004.002 0 .0542.0023.1093.002.164.002 1.5435 0 2.9905-.8835 3.6971-2.2558.3088-.5997.4233-1.2442.459-1.9004.032-.5889 0-1.1862 0-1.7695V5.7383H20.816s-.0022 2.784 0 5.1777c.0015 1.6113.0119 3.047 0 3.3418-.056 1.3935-.4372 2.3053-1.1483 3.0508-2.3586-.0018-3.8853-1.6091-3.9706-4.168-.0196-.5874-.0273-2.0437-.0273-3.7324Z" />
    </svg>
  );
}
export function SamsClubIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m14.275 1.71 9.403 9.504a1.119 1.119 0 0 1 .001 1.569l-9.401 9.507-1.624-1.64a1.136 1.136 0 0 1 0-1.596L19.631 12l-6.917-6.99a1.225 1.225 0 0 1 0-1.72l1.56-1.579zm-3.026 1.572L9.695 1.71.34 11.17a1.186 1.186 0 0 0 0 1.663l9.356 9.457 1.553-1.57a1.237 1.237 0 0 0 0-1.737L4.341 12l6.909-6.985a1.235 1.235 0 0 0-.001-1.734z" />
    </svg>
  );
}

const PAYMENT_METHOD_META = {
  Pix: { icon: PixIcon, color: "#77B6A8" },
  "Cartão Nubank Fran": { icon: NubankIcon, color: "#820AD1" },
  "Cartão Nubank Andrews": { icon: NubankIcon, color: "#820AD1" },
  "Cartão Sams": { icon: SamsClubIcon, color: "#0067A0" },
  "Cartão Renner": { icon: Shirt, color: "#E4002B" },
};
const PAYMENT_METHOD_FALLBACK_META = { icon: CreditCard, color: "#64748B" };
export const paymentMethodMeta = (name) => PAYMENT_METHOD_META[name] || PAYMENT_METHOD_FALLBACK_META;

/* lista completa: as formas fixas primeiro, as criadas pelo usuário depois */
export const allPaymentMethods = (extra = []) => [
  ...PAYMENT_METHODS,
  ...extra.filter((p) => !PAYMENT_METHODS.includes(p)),
];

export const SERASA_CATS = [
  { name: "Cartão de crédito", color: "#D6493B", icon: CreditCard },
  { name: "Empréstimo", color: "#7A5AF8", icon: HandCoins },
  { name: "Financiamento", color: "#1098AD", icon: FileText },
  { name: "Conta atrasada", color: "#E8873C", icon: AlertTriangle },
  { name: "Outros", color: "#64748B", icon: Tag },
];
export const serasaCatMeta = (n) => SERASA_CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

// Quanto a linha tirou do cartão no mês dela. Numa compra parcelada o limite cai
// o valor CHEIO de uma vez, na hora da compra — 280 de uma 280 em 3x, não os
// 93,33 da parcela. Então a parcela 1 cobra o total e as seguintes cobram só a
// parcela, que é o que você deve naquele mês.
// purchaseTotal é nulo em tudo gravado antes dessa coluna existir; o fallback
// parcela × total mantém esses lançamentos com um número razoável.
// Espelho de mobile/src/core/cards.js — mudou aqui, muda lá.
export const cardChargeOf = (e) => {
  const value = Number(e.value) || 0;
  const total = Number(e.installmentTotal) || 0;
  if (total < 2) return value;
  if ((e.installmentNumber ?? 1) !== 1) return value;
  const declared = Number(e.purchaseTotal) || 0;
  return declared > 0 ? declared : value * total;
};

// Ordem manual primeiro (nulos por último), depois maior valor.
export const byOrderThenValue = (a, b) => {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;
  return (b.value || 0) - (a.value || 0);
};

export function sortByValueSort(items, valueSort) {
  if (valueSort === "desc") return [...items].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  if (valueSort === "asc") return [...items].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  return items;
}

export function groupByPaymentMethod(items, valueSort = "none") {
  const m = new Map();
  for (const e of items) {
    const key = e.paymentMethod || PAYMENT_METHOD_FALLBACK;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  return [...m.entries()]
    .map(([name, groupItems]) => ({
      name,
      items: valueSort !== "none" ? sortByValueSort(groupItems, valueSort) : [...groupItems].sort(byOrderThenValue),
      subtotal: groupItems.reduce((s, i) => s + (Number(i.value) || 0), 0),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}
