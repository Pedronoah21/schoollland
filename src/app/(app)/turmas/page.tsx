import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { pode } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { NOME_NIVEL, NOME_TURNO } from "@/lib/rotulos";
import { Aviso } from "@/components/Aviso";
import { CamposTurma } from "@/components/CamposTurma";
import { criarTurma } from "./acoes";

export const metadata: Metadata = { title: "Turmas" };

export default async function Turmas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await exigir("turmas.ver");
  const sp = await searchParams;
  const escola = await obterEscola();
  const ano = Number(param(sp.ano)) || escola.anoLetivo;
  const turmas = await db.turma.findMany({
    where: { ano },
    orderBy: [{ nivel: "asc" }, { nome: "asc" }],
    include: { _count: { select: { alunos: { where: { status: "ATIVO" } }, matriculas: { where: { etapa: { in: ["DOCUMENTOS", "APROVACAO_DESCONTO", "ASSINATURA", "PAGAMENTO"] } } } } } },
  });
  const anos = await db.turma.findMany({ distinct: ["ano"], select: { ano: true }, orderBy: { ano: "desc" } });

  return (
    <>
      <header className="top">
        <div><span className="eyebrow">Secretaria</span><h1>Turmas {ano}</h1><p>Vagas, turno e horário de entrada usados pela matrícula e pela portaria.</p></div>
        {anos.length > 1 && (
          <div className="chips">{anos.map((a) => <Link key={a.ano} className="chip" href={`/turmas?ano=${a.ano}`} aria-current={a.ano === ano ? "true" : undefined}>{a.ano}</Link>)}</div>
        )}
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />
      <section className="panel">
        {turmas.length ? (
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Turma</th><th>Segmento</th><th>Turno</th><th>Entrada</th><th className="n">Alunos</th><th className="n">Em matrícula</th><th className="n">Vagas livres</th></tr></thead>
              <tbody>
                {turmas.map((t) => {
                  const livres = Math.max(0, t.capacidade - t._count.alunos - t._count.matriculas);
                  return (
                    <tr key={t.id}>
                      <td><Link className="row-link" href={`/turmas/${t.id}`}>{t.nome}</Link></td>
                      <td>{NOME_NIVEL[t.nivel]}</td>
                      <td>{NOME_TURNO[t.turno]}</td>
                      <td className="mono">{t.entrada} <span className="muted">+{t.toleranciaMin} min</span></td>
                      <td className="n">{t._count.alunos}/{t.capacidade}</td>
                      <td className="n">{t._count.matriculas}</td>
                      <td className="n">{livres === 0 ? <span className="pill p-warn">Lotada</span> : livres}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Nenhuma turma em {ano}. Crie a primeira abaixo.</p>}
      </section>
      {pode(u.perfil, "turmas.editar") && (
        <details className="panel" open={turmas.length === 0}>
          <summary>Nova turma</summary>
          <form action={criarTurma} className="stack" style={{ gap: 14 }}>
            <CamposTurma anoPadrao={ano} />
            <div className="actions"><button className="btn primary" type="submit">Criar turma</button></div>
          </form>
        </details>
      )}
    </>
  );
}
