import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { pode } from "@/lib/permissoes";
import { dataLocal } from "@/lib/tempo";
import { param } from "@/lib/retorno";
import { passagensDoDia, presentesAgora } from "@/lib/portaria-servico";
import { NOME_ETAPA, ETAPAS_EM_ANDAMENTO } from "@/lib/regras/matricula";
import { PassagemLinha } from "@/components/PassagemLinha";
import { sair } from "../../login/acoes";

export const metadata: Metadata = { title: "Painel" };

export default async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const usuario = await exigir("painel");
  const sp = await searchParams;
  const escola = await obterEscola();
  const hoje = dataLocal(new Date(), escola.fuso);

  const [ativos, presentes, atrasos, bloqueios, porEtapa, turmas, feed] = await Promise.all([
    db.aluno.count({ where: { status: "ATIVO" } }),
    presentesAgora(),
    db.passagem.count({ where: { dataLocal: hoje, atraso: true } }),
    db.passagem.count({ where: { dataLocal: hoje, tipo: "BLOQUEIO" } }),
    db.matricula.groupBy({ by: ["etapa"], where: { etapa: { in: ETAPAS_EM_ANDAMENTO } }, _count: true }),
    db.turma.findMany({
      where: { ano: escola.anoLetivo },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, capacidade: true, _count: { select: { alunos: { where: { status: "ATIVO" } } } } },
    }),
    pode(usuario.perfil, "portaria") ? passagensDoDia(8) : Promise.resolve([]),
  ]);
  const etapa = (e: string) => porEtapa.find((x) => x.etapa === e)?._count ?? 0;
  const emAndamento = porEtapa.reduce((a, x) => a + x._count, 0);
  const dataExtenso = new Date().toLocaleDateString("pt-BR", { timeZone: escola.fuso, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <header className="top">
        <div>
          <span className="eyebrow">{escola.nome}</span>
          <h1>Painel do dia</h1>
          <p>{dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1)}</p>
        </div>
        <form action={sair} className="tabbar-only"><span className="muted small">{usuario.nome} · </span><button className="btn link small" type="submit">Sair</button></form>
      </header>
      {param(sp.aviso) === "sem-acesso" && <div className="callout warn">Seu perfil não tem acesso àquela área. Fale com o administrador se precisar.</div>}

      <section className="kpis" aria-label="Resumo">
        <div className="kpi hl"><span className="eyebrow">Na escola agora</span><span className="v">{presentes} <small>de {ativos}</small></span><span className="d">pelos registros da portaria</span></div>
        <div className="kpi"><span className="eyebrow">Atrasos hoje</span><span className="v">{atrasos}</span><span className="d">entradas depois da tolerância</span></div>
        <div className="kpi"><span className="eyebrow">Matrículas em andamento</span><span className="v">{emAndamento}</span><span className="d">{etapa("APROVACAO_DESCONTO")} aguardando a direção</span></div>
        <div className="kpi"><span className="eyebrow">Bloqueios hoje</span><span className="v">{bloqueios}</span><span className="d">na catraca ou na portaria</span></div>
      </section>

      <div className="grid2">
        <section className="panel">
          <div className="panel-head"><h2>Portaria agora</h2>{pode(usuario.perfil, "portaria") && <Link className="btn sm" href="/portaria">Abrir portaria</Link>}</div>
          {feed.length ? <ul className="feed">{feed.map((p) => <PassagemLinha key={p.id} p={p} />)}</ul> : <p className="empty">Nenhuma passagem registrada hoje.</p>}
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Matrículas</h2>{pode(usuario.perfil, "matriculas") && <Link className="btn sm" href="/matriculas">Ver matrículas</Link>}</div>
            <ul className="todo">
              {ETAPAS_EM_ANDAMENTO.map((e) => <li key={e}><span>{NOME_ETAPA[e]}</span><b>{etapa(e)}</b></li>)}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Ocupação das turmas</h2><span className="muted small">alunos / vagas · {escola.anoLetivo}</span></div>
            {turmas.length ? (
              <div className="bars">
                {turmas.map((t) => {
                  const p = t.capacidade ? t._count.alunos / t.capacidade : 0;
                  return (
                    <div className="bar-row" key={t.id}>
                      <span>{t.nome}</span>
                      <span className="bar" role="img" aria-label={`${t._count.alunos} de ${t.capacidade} vagas`}><i className={p >= 0.95 ? "full" : ""} style={{ width: `${Math.min(100, p * 100)}%` }} /></span>
                      <span className="num" style={{ textAlign: "right" }}>{t._count.alunos}/{t.capacidade}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="empty">Nenhuma turma cadastrada para {escola.anoLetivo}.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
