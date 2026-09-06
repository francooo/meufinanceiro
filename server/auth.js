import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

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
