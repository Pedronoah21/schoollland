import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { param } from "@/lib/retorno";
import { Aviso } from "@/components/Aviso";
import { entrar } from "./acoes";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await db.usuario.count()) === 0) redirect("/primeiro-acesso");
  if (await usuarioAtual()) redirect("/painel");
  const sp = await searchParams;
  const escola = await db.escola.findUnique({ where: { id: 1 } });
  return (
    <main className="auth">
      <form action={entrar} className="panel">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden="true">P</span>
          <span><b>Pátio</b><small>{escola?.nome ?? "Gestão escolar"}</small></span>
        </div>
        <h1 style={{ fontSize: "1.5rem" }}>Entrar</h1>
        <Aviso erro={param(sp.erro)} ok={param(sp.ok)} />
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input className="input" id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn primary" type="submit">Entrar</button>
        <p className="muted small" style={{ margin: 0 }}>Esqueceu a senha? Peça ao administrador da escola para criar uma nova.</p>
      </form>
    </main>
  );
}
