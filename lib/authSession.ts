import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "agenn_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días

type Session = {
  codigo: string;
  expiresAt: number;
};

function getSecret(): string {
  const secret = process.env.AGENN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AGENN_SESSION_SECRET debe contener al menos 32 caracteres."
    );
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

export async function crearSesion(codigo: string): Promise<void> {
  const session: Session = {
    codigo: codigo.trim().toUpperCase(),
    expiresAt: Date.now() + SESSION_DURATION * 1000,
  };

  const payload = Buffer.from(
    JSON.stringify(session)
  ).toString("base64url");

  const signature = sign(payload);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, `${payload}.${signature}`, {
	  httpOnly: true,
	  secure: process.env.NODE_ENV === "production",
	  sameSite: "lax",
	  path: "/",
  });
	}

export async function obtenerSesion(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expectedSignature = sign(payload);

    const received = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Session;

    if (
      typeof session.codigo !== "string" ||
      !session.codigo.trim() ||
      typeof session.expiresAt !== "number" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function cerrarSesion(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}
