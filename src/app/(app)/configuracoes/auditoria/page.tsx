import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { param } from "@/lib/retorno";
import { horaLocal } from "@/lib/tempo";

export const metadata: Metadata = { title: "Auditoria" };

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigir("auditoria");
  const sp = await searchParams;
  const escola = await obterEscola();
  const filtro = param(sp.acao);
  const registros = await db.auditoria.findMany({
    where: filtro ? { acao: { startsWith: filtro } } : {},
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { usuario: { select: { nome: true } } },
  });
  const grupos = [["", "Tudo"], ["login", "Acessos"], ["aluno", "Alunos"], ["matricula", "Matrículas"], ["portaria", "Portaria"], ["usuario", "Equipe"], ["escola", "Escola"]];

  return (
    <>
      <header className="top">
        <div><span className="eyebrow"><Link href="/configuracoes">Configurações</Link></span><h1>Auditoria</h1><p>Quem fez o quê e quando. Os 200 registros mais recentes.</p></div>
      </header>
      <div className="chips">{grupos.map(([k, l]) => <Link key={k} className="chip" href={k ? `/configuracoes/auditoria?acao=${k}` : "/configuracoes/auditoria"} aria-current={filtro === k ? "true" : undefined}>{l}</Link>)}</div>
      <section className="panel">
        {registros.length ? (
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Registro</th><th>Detalhes</th></tr></thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="mono small" style={{ whiteSpace: "nowrap" }}>{r.criadoEm.toLocaleDateString("pt-BR", { timeZone: escola.fuso })} {horaLocal(r.criadoEm, escola.fuso)}</td>
                    <td>{r.usuario?.nome ?? <span className="muted">sistema</span>}</td>
                    <td className="mono small">{r.acao}</td>
                    <td className="small">{r.entidade}</td>
                    <td className="small muted" style={{ maxWidth: 360, wordBreak: "break-word" }}>{r.detalhes ? JSON.stringify(r.detalhes) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Nenhum registro.</p>}
      </section>
    </>
  );
}
