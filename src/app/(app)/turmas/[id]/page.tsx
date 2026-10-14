import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { pode } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { NOME_NIVEL, NOME_TURNO } from "@/lib/rotulos";
import { Aviso } from "@/components/Aviso";
import { Avatar } from "@/components/Avatar";
import { CamposTurma } from "@/components/CamposTurma";
import { editarTurma } from "../acoes";

export const metadata: Metadata = { title: "Turma" };

export default async function TurmaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await exigir("turmas.ver");
  const { id } = await params;
  const sp = await searchParams;
  const t = await db.turma.findUnique({ where: { id }, include: { alunos: { where: { status: "ATIVO" }, orderBy: { nome: "asc" }, select: { id: true, nome: true, codigo: true } } } });
  if (!t) notFound();
  const podeEditar = pode(u.perfil, "turmas.editar");

  return (
    <>
      <header className="top">
        <div><span className="eyebrow"><Link href="/turmas">Turmas</Link> · {t.ano}</span><h1>{t.nome}</h1><p>{NOME_NIVEL[t.nivel]} · {NOME_TURNO[t.turno]} · entrada às {t.entrada}</p></div>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />
      <div className="grid2">
        <section className="panel">
          <div className="panel-head"><h2>Alunos ativos</h2><span className="muted small">{t.alunos.length} de {t.capacidade}</span></div>
          {t.alunos.length ? (
            <ul className="todo">
              {t.alunos.map((a) => (
                <li key={a.id}><span className="who"><Avatar nome={a.nome} /><Link href={`/alunos/${a.id}`}>{a.nome}</Link></span><span className="mono muted small">{a.codigo}</span></li>
              ))}
            </ul>
          ) : <p className="empty">Nenhum aluno ativo nesta turma.</p>}
        </section>
        {podeEditar && (
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Dados da turma</h2>
            <form action={editarTurma} className="stack" style={{ gap: 14 }}>
              <input type="hidden" name="id" value={t.id} />
              <CamposTurma anoPadrao={t.ano} v={t} />
              <div className="actions"><button className="btn primary" type="submit">Salvar</button></div>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
