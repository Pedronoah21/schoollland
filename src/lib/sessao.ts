import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { pode, type Acao } from "./permissoes";

const COOKIE = "patio_sessao";
const DURACAO_HORAS = 12;

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("Defina a variável SESSION_SECRET com pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(segredo);
}

export async function criarSessao(usuarioId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(chave());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_HORAS * 60 * 60,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function idDaSessao(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Usuário logado e ativo, ou null. Consulta o banco para que desativar alguém valha na hora. */
export const usuarioAtual = cache(async () => {
  const id = await idDaSessao();
  if (!id) return null;
  const u = await db.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });
  return u && u.ativo ? u : null;
});

/** Exige login (e, se informado, permissão). Redireciona quando falta. */
export async function exigir(acao?: Acao) {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (acao && !pode(u.perfil, acao)) redirect("/painel?aviso=sem-acesso");
  return u;
}
