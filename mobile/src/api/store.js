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
  loadWishlist: async () => {
    const d = await request("/api/wishlist");
    return Array.isArray(d.items) ? d.items : [];
  },
  saveWishlist: (items) => request("/api/wishlist", { method: "PUT", body: { items } }),
  loadShoppingList: async (list) => {
    const d = await request(`/api/shopping?list=${list}`);
    return Array.isArray(d.items) ? d.items : [];
  },
  saveShoppingList: (list, items) =>
    request(`/api/shopping?list=${list}`, { method: "PUT", body: { items } }),
  loadSerasa: async () => {
    const d = await request("/api/serasa");
    return Array.isArray(d.items) ? d.items : [];
  },
  saveSerasa: (items) => request("/api/serasa", { method: "PUT", body: { items } }),
  loadCards: async () => {
    const d = await request("/api/cards");
    return Array.isArray(d.items) ? d.items : [];
  },
  saveCards: (items) => request("/api/cards", { method: "PUT", body: { items } }),
};
