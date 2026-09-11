import * as Crypto from "expo-crypto";

/* Hermes nao tem `crypto` global. A ramificacao Math.random() do uid() da web
   passaria despercebida aqui — a coluna id e TEXT, nao UUID, entao o banco
   aceitaria ids fracos sem reclamar e a colisao so apareceria como item sumido. */
export const uid = () => Crypto.randomUUID();
