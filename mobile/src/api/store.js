import { request } from "./client";

/* Espelha o objeto `store` da web (meu-caixa.jsx:138), com duas diferencas: a
   URL e absoluta (o client prefixa a base) e o token vai no header Bearer, ja
   que o celular nao tem cookie jar da origem. */
export const store = {
  loadMonths: async () => {
    const d = await request("/api/months");
    return Array.isArray(d.months) ? d.months : [];
  },
  load: async (month) => {
    const d = await request(`/api/data?month=${encodeURIComponent(month)}`);
    return d && Array.isArray(d.expenses) ? d : null;
  },
  save: (month, data) =>
    request("/api/data", { method: "PUT", body: { month, ...data } }),
  loadPaymentMethods: async () => {
    const d = await request("/api/payment-methods");
    return Array.isArray(d.methods) ? d.methods : [];
  },
  loadSerasa: async () => {
    const d = await request("/api/serasa");
    return Array.isArray(d.items) ? d.items : [];
  },
  saveSerasa: (items) => request("/api/serasa", { method: "PUT", body: { items } }),
  loadCards: async () => {
    const d = await request("/api/cards");
    return Array.isArray(d.items) ? d.items : [];
  },
};
