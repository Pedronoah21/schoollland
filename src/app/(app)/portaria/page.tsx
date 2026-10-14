import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { param } from "@/lib/retorno";
import { dataLocal } from "@/lib/tempo";
import { estaDentro, exigeAcompanhante, MOTIVO_MINIMO } from "@/lib/regras/portaria";
import { passagensDoDia, presentesAgora } from "@/lib/portaria-servico";
import { NOME_STATUS, pillStatus } from "@/lib/rotulos";
import { Aviso } from "@/components/Aviso";
import { Avatar } from "@/components/Avatar";
import { AoVivo } from "./AoVivo";
import { liberarManual, saidaAcompanhada } from "./acoes";

export const metadata: Metadata = { title: "Portaria" };

export default async function Portaria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigir("portaria");
  const sp = await searchParams;
  const q = param(sp.q).trim();
  const escola = await obterEscola();
  const hoje = dataLocal(new Date(), escola.fuso);
  const [inicial, presentes, achados] = await Promise.all([
    passagensDoDia(40),
    presentesAgora(),
    q.length >= 2
      ? db.aluno.findMany({
          where: { OR: [{ nome: { contains: q, mode: "insensitive" } }, { codigo: { contains: q } }, { cartao: q }] },
          orderBy: { nome: "asc" },
          take: 8,
          include: {
            turma: { select: { nome: true, nivel: true } },
            autorizados: { select: { nome: true, parentesco: true } },
            responsaveis: { select: { parentesco: true, responsavel: { select: { nome: true } } } },
            passagens: { where: { dataLocal: hoje }, select: { tipo: true, ocorridaEm: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <header className="top">
        <div><span className="eyebrow">Controle de acesso</span><h1>Portaria</h1><p>Os registros da catraca aparecem aqui sozinhos. Use a busca para liberar alguém manualmente ou registrar uma saída acompanhada.</p></div>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />

      <section className="panel">
        <form className="filters" action="/portaria">
          <input className="input" type="search" name="q" defaultValue={q} placeholder="Nome, matrícula ou número do cartão" aria-label="Buscar aluno" autoComplete="off" />
          <button className="btn" type="submit">Buscar aluno</button>
          {q && <Link className="btn link small" href="/portaria">Limpar</Link>}
        </form>
        {q.length >= 2 && (
          achados.length ? (
            <div className="stack" style={{ gap: 12, marginTop: 14 }}>
              {achados.map((a) => {
                const dentro = estaDentro(a.passagens);
                const pequeno = exigeAcompanhante(a.turma?.nivel ?? null);
                const quem = [
                  ...a.responsaveis.map((r) => `${r.responsavel.nome} (${r.parentesco})`),
                  ...a.autorizados.map((x) => `${x.nome} (${x.parentesco})`),
                ];
                return (
                  <article key={a.id} className="card" style={{ gap: 12 }}>
                    <div className="who" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                      <span className="who"><Avatar nome={a.nome} /><span><b>{a.nome}</b><br /><span className="meta">{a.turma?.nome ?? "Sem turma"} · {a.codigo ?? "sem código"}</span></span></span>
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className={`pill ${pillStatus(a.status)}`}>{NOME_STATUS[a.status]}</span>
                        {a.status === "ATIVO" && <span className={`pill ${dentro ? "p-info" : "p-mute"}`}>{dentro ? "Na escola" : "Fora da escola"}</span>}
                        {a.alergias && <span className="pill p-bad">Alergia: {a.alergias}</span>}
                      </span>
                    </div>
                    {a.status !== "ATIVO" ? (
                      <div className="callout warn">Acesso bloqueado: {a.status === "INATIVO" ? "matrícula inativa" : "matrícula não concluída"}. Encaminhe à secretaria.</div>
                    ) : (
                      <div className="form">
                        {dentro && pequeno && (
                          <form action={saidaAcompanhada} className="stack" style={{ gap: 8 }}>
                            <input type="hidden" name="alunoId" value={a.id} /><input type="hidden" name="q" value={q} />
                            <label className="small" htmlFor={`ac-${a.id}`} style={{ fontWeight: 600 }}>Saída com pessoa autorizada</label>
                            <select className="select" id={`ac-${a.id}`} name="acompanhante" required defaultValue="">
                              <option value="" disabled>Quem está buscando?</option>
                              {quem.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <button className="btn primary" type="submit">Registrar saída</button>
                          </form>
                        )}
                        <form action={liberarManual} className="stack" style={{ gap: 8 }}>
                          <input type="hidden" name="alunoId" value={a.id} /><input type="hidden" name="q" value={q} />
                          <label className="small" htmlFor={`mo-${a.id}`} style={{ fontWeight: 600 }}>Liberação manual de {dentro ? "saída" : "entrada"}</label>
                          <input className="input" id={`mo-${a.id}`} name="motivo" minLength={MOTIVO_MINIMO} required placeholder="Motivo: ex. esqueceu o cartão, conferido pela foto" />
                          <button className="btn" type="submit">Liberar {dentro ? "saída" : "entrada"}</button>
                          {dentro && pequeno && <span className="hint">Para alunos pequenos, a saída manual também exige pessoa autorizada ou autorização do dia.</span>}
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <p className="empty">Nenhum aluno encontrado para “{q}”.</p>
        )}
      </section>

      <AoVivo inicial={inicial} presentesInicial={presentes} />
    </>
  );
}
