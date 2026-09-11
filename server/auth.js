import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { randomBytes, createHmac } from "node:crypto";

/* Um client id por plataforma (web, android, ios). GOOGLE_CLIENT_ID (singular)
   segue aceito para não derrubar ambientes que ainda só têm ele configurado. */
const CLIENT_IDS = [
  ...String(process.env.GOOGLE_CLIENT_IDS || "").split(","),
  process.env.GOOGLE_CLIENT_ID || "",
]
  .map((id) => id.trim())
  .filter(Boolean)
  .filter((id, i, all) => all.indexOf(id) === i);

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const client = new OAuth2Client();

const isAllowed = (email) =>
  !!email && !!ALLOWED_EMAIL && email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();

/* Precisa ser público: o resgate do pareamento reconfere o e-mail gravado na
   linha, para que trocar ALLOWED_EMAIL invalide também os códigos já emitidos. */
export const isAllowedEmail = isAllowed;

/* ---------- pareamento de celular ---------- */
/* Crockford base32: sem I, L, O e U — nada que se confunda lido de uma tela. */
const PAIR_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PAIR_CODE_LENGTH = 8;
export const PAIR_TTL_MINUTES = 5;

/* 32^8 = 2^40. O endpoint de resgate é público por definição, e contador de
   tentativas por código nunca incrementa (quem varre não acerta a linha viva),
   enquanto um limitador global viraria arma de negação de serviço contra o
   próprio pareamento. Sobra entropia: com 6 dígitos seriam ~26% de chance a
   1000 req/s numa janela de 5 min; com 2^40, 2,7e-7. */
export function generatePairingCode() {
  const bytes = randomBytes(PAIR_CODE_LENGTH);
  let code = "";
  for (const b of bytes) code += PAIR_ALPHABET[b & 31]; // 256 % 32 === 0 -> sem viés de módulo
  return code;
}

export const formatPairingCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

/* I/L e O nunca saem do gerador, então mapeá-los na entrada só perdoa quem
   digitou o que leu — não amplia o espaço aceito nem colide com código válido. */
export function normalizePairingCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export const isPairingCodeShaped = (code) =>
  code.length === PAIR_CODE_LENGTH && [...code].every((c) => PAIR_ALPHABET.includes(c));

/* HMAC, não SHA-256 puro: com 40 bits de entropia um hash sem chave cai em
   segundos numa GPU, então só a chave torna um vazamento do banco inútil. */
export const hashPairingCode = (code) =>
  createHmac("sha256", SESSION_SECRET).update(code).digest("hex");

export async function verifyGoogleCredential(credential) {
  if (CLIENT_IDS.length === 0 || !ALLOWED_EMAIL || !SESSION_SECRET) {
    throw new Error("Autenticação não configurada no servidor.");
  }
  const ticket = await client.verifyIdToken({ idToken: credential, audience: CLIENT_IDS });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error("E-mail do Google não verificado.");
  }
  if (!isAllowed(payload.email)) {
    throw new Error("Esta conta Google não tem acesso a este aplicativo.");
  }
  return payload.email;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  };
}

/* Assina a sessão sem decidir como ela vai ser entregue. `expiresAt` sai do
   próprio claim exp para não divergir da validade real do token. */
export function signSession(email) {
  const token = jwt.sign({ email }, SESSION_SECRET, { expiresIn: "30d" });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: exp * 1000 };
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

/* Mantida com a mesma assinatura de antes: quem já chamava não quebra. */
export function issueSessionCookie(res, email) {
  const { token } = signSession(email);
  setSessionCookie(res, token);
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

function bearerToken(req) {
  const header = req.headers?.authorization;
  if (typeof header !== "string") return null;
  const match = /^Bearer[ \t]+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() || null : null;
}

export function getSessionEmail(req) {
  /* Bearer primeiro (clientes nativos), cookie como fallback (front web). */
  const token = bearerToken(req) || req.cookies?.[SESSION_COOKIE];
  if (!token || !SESSION_SECRET) return null;
  let email;
  try {
    email = jwt.verify(token, SESSION_SECRET).email;
  } catch {
    return null;
  }
  /* Reconferido a cada requisição: mudar ALLOWED_EMAIL invalida na hora as
     sessões já emitidas, em vez de esperar os 30 dias do token expirarem. */
  return isAllowed(email) ? email : null;
}

export function requireAuth(req, res, next) {
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: "Não autenticado." });
  req.userEmail = email;
  next();
}
