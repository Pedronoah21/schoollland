import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Gera um token novo. Ele só é mostrado uma vez; no banco fica apenas o hash. */
export function novoToken(): string {
  return `ptc_${randomBytes(24).toString("hex")}`;
}

/** Identifica a catraca pelo cabeçalho Authorization: Bearer <token> */
export async function dispositivoDaRequisicao(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (!m) return null;
  const d = await db.dispositivo.findUnique({ where: { tokenHash: hashToken(m[1]!) } });
  if (!d || !d.ativo) return null;
  await db.dispositivo.update({ where: { id: d.id }, data: { ultimoContato: new Date() } });
  return d;
}
