import { request } from "./client";
import { writeCache } from "./cache";

/* Toda leitura que volta do servidor com sucesso vira o novo cache da chave.
   O snapshot do mes junta dois endpoints (/api/data + fechamentos), entao quem
   grava esse e o HomeScreen, que tem os dois. */
const keep = (key) => (data) => {
  writeCache(key, data);
  return data;
};

/* Espelha o objeto `store` da web (meu-caixa.jsx:138), com duas diferencas: a
   URL e absoluta (o client prefixa a base) e o token vai no header Bearer, ja
   que o celular nao tem cookie jar da origem. */
export const store = {
  loadMonths: async () => {
    const d = await request("/api/months");
    return keep("months")(Array.isArray(d.months) ? d.months : []);
  },
  /* Cria o mes no servidor, que ja traz do mes anterior os recorrentes e as
     parcelas em andamento (server/db.js createMonth). Recusa mes existente. */
  createMonth: (month) => request("/api/months", { method: "POST", body: { month } }),
  load: async (month) => {
    const d = await request(`/api/data?month=${encodeURIComponent(month)}`);
    return d && Array.isArray(d.expenses) ? d : null;
  },
  save: (month, data) =>
    request("/api/data", { method: "PUT", body: { month, ...data } }),
  loadPaymentMethods: async () => {
    const d = await request("/api/payment-methods");
    return keep("paymentMethods")(Array.isArray(d.methods) ? d.methods : []);
  },
  /* Categorias de TODOS os meses: sem isto uma categoria personalizada some do
     seletor no primeiro mes que nao tiver gasto nela. */
  loadCategories: async () => {
    const d = await request("/api/categories");
    return keep("categories")(Array.isArray(d.categories) ? d.categories : []);
  },
  /* Endpoint dedicado e atomico: mover nao cabe no PUT de colecao inteira,
     que so enxerga um mes por vez. */
  moveExpenseToMonth: (id, month) =>
    request(`/api/expenses/${encodeURIComponent(id)}/month`, { method: "PUT", body: { month } }),
  loadWishlist: async () => {
    const d = await request("/api/wishlist");
    return keep("wishlist")(Array.isArray(d.items) ? d.items : []);
  },
  saveWishlist: (items) => request("/api/wishlist", { method: "PUT", body: { items } }),
  loadShoppingList: async (list) => {
    const d = await request(`/api/shopping?list=${list}`);
    return keep(`shopping-${list}`)(Array.isArray(d.items) ? d.items : []);
  },
  saveShoppingList: (list, items) =>
    request(`/api/shopping?list=${list}`, { method: "PUT", body: { items } }),
  loadSerasa: async () => {
    const d = await request("/api/serasa");
    return keep("serasa")(Array.isArray(d.items) ? d.items : []);
  },
  saveSerasa: (items) => request("/api/serasa", { method: "PUT", body: { items } }),
  loadCards: async () => {
    const d = await request("/api/cards");
    return keep("cards")(Array.isArray(d.items) ? d.items : []);
  },
  saveCards: (items) => request("/api/cards", { method: "PUT", body: { items } }),
  /* Fechamento de cartao e preso ao mes, como /api/data: o mes vai na query. */
  loadCardClosings: async (month) => {
    const d = await request(`/api/card-closings?month=${encodeURIComponent(month)}`);
    return Array.isArray(d.items) ? d.items : [];
  },
  saveCardClosings: (month, items) =>
    request(`/api/card-closings?month=${encodeURIComponent(month)}`, { method: "PUT", body: { items } }),
};
