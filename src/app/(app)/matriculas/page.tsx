import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { param } from "@/lib/retorno";
import { ETAPAS_EM_ANDAMENTO, NOME_ETAPA } from "@/lib/regras/matricula";
import { Aviso } from "@/components/Aviso";

export const metadata: Metadata = { title: "Matrículas" };

export default async function Matriculas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigir("matriculas");
  const sp = await searchParams;
  const [abertas, recentes] = await Promise.all([
    db.matricula.findMany({
      where: { etapa: { in: ETAPAS_EM_ANDAMENTO } },
      orderBy: { criadoEm: "asc" },
      include: {
        aluno: { select: { nome: true, responsaveis: { where: { financeiro: true }, take: 1, select: { responsavel: { select: { nome: true } } } } } },
        turma: { select: { nome: true } },
      },
    }),
    db.matricula.findMany({
      where: { etapa: { in: ["CONCLUIDA", "CANCELADA"] } },
      orderBy: { atualizadoEm: "desc" },
      take: 10,
      include: { aluno: { select: { nome: true } }, turma: { select: { nome: true } } },
    }),
  ]);

  return (
    <>
      <header className="top">
        <div><span className="eyebrow">Secretaria</span><h1>Matrículas</h1><p>Dos documentos ao primeiro pagamento. Ao concluir, o aluno ganha o código de matrícula e passa a entrar pela catraca.</p></div>
        <Link className="btn primary" href="/matriculas/nova">Nova matrícula</Link>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />
      <div className="pipe">
        {ETAPAS_EM_ANDAMENTO.map((et) => {
          const itens = abertas.filter((m) => m.etapa === et);
          return (
            <section className="col" key={et} aria-label={NOME_ETAPA[et]}>
              <h3><span>{NOME_ETAPA[et]}</span><span className="mono muted">{itens.length}</span></h3>
              {itens.length ? itens.map((m) => (
                <Link className="card" key={m.id} href={`/matriculas/${m.id}`}>
                  <b>{m.aluno.nome}</b>
                  <span className="meta">{m.turma.nome} · {m.ano}</span>
                  <span className="meta">Resp. {m.aluno.responsaveis[0]?.responsavel.nome ?? "—"}</span>
                  {m.descontoPct > 0 && <span className="meta">Desconto de {m.descontoPct}%{m.descontoAprovado ? " (aprovado)" : ""}</span>}
                  <span className="meta mono">desde {m.criadoEm.toLocaleDateString("pt-BR")}</span>
                </Link>
              )) : <p className="muted small" style={{ margin: 0 }}>Nada nesta etapa.</p>}
            </section>
          );
        })}
      </div>
      {recentes.length > 0 && (
        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Encerradas recentemente</h2>
          <ul className="todo">
            {recentes.map((m) => (
              <li key={m.id}>
                <Link href={`/matriculas/${m.id}`}>{m.aluno.nome} · {m.turma.nome}</Link>
                <span className={`pill ${m.etapa === "CONCLUIDA" ? "p-good" : "p-mute"}`}>{NOME_ETAPA[m.etapa]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
