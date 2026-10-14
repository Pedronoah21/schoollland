import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, StatusAluno } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { pode } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { NOME_STATUS, pillStatus } from "@/lib/rotulos";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = { title: "Alunos" };
const POR_PAGINA = 50;

export default async function Alunos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await exigir("alunos.ver");
  const sp = await searchParams;
  const escola = await obterEscola();
  const q = param(sp.q).trim();
  const turma = param(sp.turma);
  const status = (["ATIVO", "PENDENTE", "INATIVO"].includes(param(sp.status)) ? param(sp.status) : "ATIVO") as StatusAluno;
  const pagina = Math.max(1, Number(param(sp.p)) || 1);

  const where: Prisma.AlunoWhereInput = {
    status,
    ...(turma ? { turmaId: turma } : {}),
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { codigo: { contains: q } },
            { responsaveis: { some: { responsavel: { nome: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const [total, alunos, turmas] = await Promise.all([
    db.aluno.count({ where }),
    db.aluno.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, nome: true, codigo: true, status: true,
        turma: { select: { nome: true } },
        responsaveis: { where: { financeiro: true }, take: 1, select: { responsavel: { select: { nome: true } } } },
      },
    }),
    db.turma.findMany({ where: { ano: escola.anoLetivo }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (mud: Record<string, string>) => {
    const s = new URLSearchParams({ ...(q ? { q } : {}), ...(turma ? { turma } : {}), status, ...mud });
    return `/alunos?${s.toString()}`;
  };

  return (
    <>
      <header className="top">
        <div><span className="eyebrow">Cadastro</span><h1>Alunos</h1><p>Cadastro único usado pela matrícula e pela portaria.</p></div>
        {pode(u.perfil, "matriculas") && <Link className="btn primary" href="/matriculas/nova">Nova matrícula</Link>}
      </header>
      <section className="panel">
        <form className="filters" style={{ marginBottom: 12 }} action="/alunos">
          <input className="input" type="search" name="q" defaultValue={q} placeholder="Nome, matrícula ou responsável" aria-label="Buscar aluno" />
          <select className="select" name="turma" defaultValue={turma} aria-label="Turma">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input type="hidden" name="status" value={status} />
          <button className="btn" type="submit">Buscar</button>
        </form>
        <div className="chips" style={{ marginBottom: 12 }} role="group" aria-label="Situação">
          {(["ATIVO", "PENDENTE", "INATIVO"] as const).map((s) => (
            <Link key={s} className="chip" href={link({ status: s, p: "1" })} aria-current={status === s ? "true" : undefined}>{NOME_STATUS[s]}</Link>
          ))}
        </div>
        {alunos.length ? (
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Responsável financeiro</th><th>Situação</th></tr></thead>
              <tbody>
                {alunos.map((a) => (
                  <tr key={a.id}>
                    <td><span className="who"><Avatar nome={a.nome} /><Link className="row-link" href={`/alunos/${a.id}`}>{a.nome}</Link></span></td>
                    <td className="mono">{a.codigo ?? "—"}</td>
                    <td>{a.turma?.nome ?? "—"}</td>
                    <td>{a.responsaveis[0]?.responsavel.nome ?? "—"}</td>
                    <td><span className={`pill ${pillStatus(a.status)}`}>{NOME_STATUS[a.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Nenhum aluno encontrado.</p>}
        {paginas > 1 && (
          <div className="actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
            <span className="muted small">{total} alunos · página {pagina} de {paginas}</span>
            <span style={{ display: "flex", gap: 8 }}>
              {pagina > 1 && <Link className="btn sm" href={link({ p: String(pagina - 1) })}>Anterior</Link>}
              {pagina < paginas && <Link className="btn sm" href={link({ p: String(pagina + 1) })}>Próxima</Link>}
            </span>
          </div>
        )}
      </section>
    </>
  );
}
