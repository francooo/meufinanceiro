import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const client = new OAuth2Client(CLIENT_ID);

export async function verifyGoogleCredential(credential) {
  if (!CLIENT_ID || !ALLOWED_EMAIL || !SESSION_SECRET) {
    throw new Error("Autenticação não configurada no servidor.");
  }
  const ticket = await client.verifyIdToken({ idToken: credential, audience: CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error("E-mail do Google não verificado.");
  }
  if (payload.email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
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

export function issueSessionCookie(res, email) {
  const token = jwt.sign({ email }, SESSION_SECRET, { expiresIn: "30d" });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionEmail(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || !SESSION_SECRET) return null;
  try {
    return jwt.verify(token, SESSION_SECRET).email;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: "Não autenticado." });
  req.userEmail = email;
  next();
}
