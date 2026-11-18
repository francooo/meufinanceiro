import { API_URL } from "./config";

let token = null;
let onUnauthorized = async () => {};

export const setToken = (t) => {
  token = t;
};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export async function request(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : null),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  /* getSessionEmail devolve null para token expirado, conta excluida ou conta
     fora da lista (quando ha lista) — tudo chega como 401 e significa a mesma coisa
     para o app: a sessão morreu, volte ao pareamento. Tratar só localmente
     deixaria cada tela mostrando "lista vazia" sem explicação. */
  if (auth && res.status === 401) {
    await onUnauthorized();
    throw new Error("unauthorized");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* O resgate é o único endpoint que roda sem token — é justamente o que troca
   o código pelo primeiro token. */
export const redeemPairingCode = (code) =>
  request("/api/auth/pair/redeem", { method: "POST", body: { code }, auth: false });

export const fetchMe = () => request("/api/auth/me");
