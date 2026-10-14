import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { param } from "@/lib/retorno";
import { Aviso } from "@/components/Aviso";
import { configurarEscola } from "./acoes";
import { FUSOS } from "@/lib/fusos";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default async function PrimeiroAcesso({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await db.usuario.count()) > 0) redirect("/login");
  const sp = await searchParams;
  const ano = new Date().getFullYear();
  return (
    <main className="auth">
      <form action={configurarEscola} className="panel" style={{ width: "min(560px, 100%)" }}>
        <div>
          <span className="eyebrow">Primeiro acesso</span>
          <h1 style={{ fontSize: "1.6rem" }}>Configurar a escola</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Esta tela aparece só uma vez. Você vira o administrador e depois cria os acessos da equipe.</p>
        </div>
        <Aviso erro={param(sp.erro)} />
        <div className="form">
          <div className="field full">
            <label htmlFor="escola">Nome da escola</label>
            <input className="input" id="escola" name="escola" required minLength={3} />
          </div>
          <div className="field">
            <label htmlFor="ano">Ano letivo atual</label>
            <input className="input" id="ano" name="ano" type="number" defaultValue={ano} min={2020} max={2100} required />
          </div>
          <div className="field">
            <label htmlFor="fuso">Fuso horário</label>
            <select className="select" id="fuso" name="fuso" defaultValue="America/Manaus">
              {FUSOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="nome">Seu nome</label>
            <input className="input" id="nome" name="nome" required minLength={3} autoComplete="name" />
          </div>
          <div className="field full">
            <label htmlFor="email">Seu e-mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input className="input" id="senha" name="senha" type="password" required minLength={10} autoComplete="new-password" />
            <span className="hint">Mínimo de 10 caracteres.</span>
          </div>
          <div className="field">
            <label htmlFor="senha2">Repita a senha</label>
            <input className="input" id="senha2" name="senha2" type="password" required minLength={10} autoComplete="new-password" />
          </div>
          <label className="check field full">
            <input type="checkbox" name="turmasPadrao" defaultChecked /> Criar turmas iniciais (da educação infantil ao ensino médio), que podem ser editadas depois
          </label>
        </div>
        <button className="btn primary" type="submit">Criar escola e entrar</button>
      </form>
    </main>
  );
}
