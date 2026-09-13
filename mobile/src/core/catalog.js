/* Espelha CATS/SERASA_CATS/PAYMENT_METHOD_META de meu-caixa.jsx, mas com `icon`
   como STRING. Na web esses objetos embutem componentes do lucide-react; manter
   dado puro aqui e o que permite diffar os dois lados e, mais tarde, compartilhar. */
export const CATS = [
  { name: "Moradia", color: "#2E7D6B", icon: "Home" },
  { name: "Educação", color: "#3B6EA5", icon: "GraduationCap" },
  { name: "Saúde", color: "#C65D7B", icon: "HeartPulse" },
  { name: "Casa / Utilidades", color: "#E8873C", icon: "Lightbulb" },
  { name: "Telefonia", color: "#1098AD", icon: "Smartphone" },
  { name: "Impostos", color: "#7A5AF8", icon: "Landmark" },
  { name: "Transporte", color: "#2F9E44", icon: "Car" },
  { name: "Cartões / Financeiro", color: "#D6493B", icon: "CreditCard" },
  { name: "Assinaturas / Serviços", color: "#B5892E", icon: "Repeat" },
  { name: "Lazer / Hobbies", color: "#E64980", icon: "Gamepad2" },
];

export const FALLBACK = { color: "#64748B", icon: "Tag" };
export const catMeta = (n) => CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

export const CARTOES_CATEGORY = "Cartões / Financeiro";
export const PAYMENT_METHODS = [
  "Pix",
  "Cartão Nubank Fran",
  "Cartão Nubank Andrews",
  "Cartão Sams",
  "Cartão Renner",
];
export const PAYMENT_METHOD_FALLBACK = "Sem forma de pagamento";

export const allPaymentMethods = (extra = []) => [
  ...PAYMENT_METHODS,
  ...extra.filter((p) => !PAYMENT_METHODS.includes(p)),
];

export const SERASA_CATS = [
  { name: "Cartão de crédito", color: "#D6493B", icon: "CreditCard" },
  { name: "Empréstimo", color: "#7A5AF8", icon: "HandCoins" },
  { name: "Financiamento", color: "#1098AD", icon: "FileText" },
  { name: "Conta atrasada", color: "#E8873C", icon: "AlertTriangle" },
  { name: "Outros", color: "#64748B", icon: "Tag" },
];

export const serasaCatMeta = (n) =>
  SERASA_CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };
