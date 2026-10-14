import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { pode } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { NOME_NIVEL } from "@/lib/rotulos";
import { DOCUMENTOS, ETAPAS_EM_ANDAMENTO, LIMITE_DESCONTO_SEM_APROVACAO, NOME_ETAPA, avancarEtapa, documentosFaltando, type Etapa } from "@/lib/regras/matricula";
import { Aviso } from "@/components/Aviso";
import { avancar, cancelar, definirDesconto, salvarDocumentos } from "../acoes";

export const metadata: Metadata = { title: "Matrícula" };

const PASSOS: Etapa[] = ["DOCUMENTOS", "APROVACAO_DESCONTO", "ASSINATURA", "PAGAMENTO", "CONCLUIDA"];
const BOTAO: Partial<Record<Etapa, string>> = {
  DOCUMENTOS: "Documentos conferidos",
  APROVACAO_DESCONTO: "Seguir para assinatura",
  ASSINATURA: "Contrato assinado",
  PAGAMENTO: "1º pagamento confirmado: concluir",
};

export default async function MatriculaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await exigir("matriculas");
  const { id } = await params;
  const sp = await searchParams;
  const m = await db.matricula.findUnique({
    where: { id },
    include: { turma: true, aluno: { include: { responsaveis: { include: { responsavel: true } } } } },
  });
  if (!m) notFound();
  const aberta = ETAPAS_EM_ANDAMENTO.includes(m.etapa);
  const faltam = documentosFaltando(m, m.turma.nivel);
  const previa = aberta ? avancarEtapa({ ...m, nivel: m.turma.nivel }) : null;
  const podeAprovar = pode(u.perfil, "matriculas.aprovarDesconto");
  const idxAtual = PASSOS.indexOf(m.etapa);

  return (
    <>
      <header className="top">
        <div>
          <span className="eyebrow"><Link href="/matriculas">Matrículas</Link> · {m.ano}</span>
          <h1>{m.aluno.nome}</h1>
          <p>{m.turma.nome} · {NOME_NIVEL[m.turma.nivel]} · <Link href={`/alunos/${m.alunoId}`}>ficha do aluno</Link></p>
        </div>
        <span className={`pill ${m.etapa === "CONCLUIDA" ? "p-good" : m.etapa === "CANCELADA" ? "p-mute" : "p-warn"}`}>{NOME_ETAPA[m.etapa]}</span>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />

      {m.etapa !== "CANCELADA" && (
        <ol className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Etapas">
          {PASSOS.filter((p) => p !== "APROVACAO_DESCONTO" || m.descontoPct > LIMITE_DESCONTO_SEM_APROVACAO).map((p) => {
            const i = PASSOS.indexOf(p);
            return <li key={p} className="chip" aria-current={p === m.etapa ? "true" : undefined} style={i < idxAtual ? { color: "var(--good)", borderColor: "var(--good)" } : undefined}>{NOME_ETAPA[p]}</li>;
          })}
        </ol>
      )}

      <div className="grid2">
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Documentos</h2><span className="muted small">{faltam.length ? `${faltam.length} pendente${faltam.length === 1 ? "" : "s"}` : "completos"}</span></div>
            <form action={salvarDocumentos} className="stack" style={{ gap: 8 }}>
              <input type="hidden" name="id" value={m.id} />
              {DOCUMENTOS.filter((d) => !(d.campo === "docHistorico" && m.turma.nivel === "INFANTIL")).map((d) => (
                <label className="check" key={d.campo}><input type="checkbox" name={d.campo} defaultChecked={m[d.campo]} disabled={!aberta} /> {d.nome}</label>
              ))}
              {aberta && <div className="actions"><button className="btn" type="submit">Salvar documentos</button></div>}
            </form>
          </section>

          {aberta && previa && (
            <section className="panel">
              <h2 style={{ marginBottom: 10 }}>Próximo passo</h2>
              {previa.ok ? (
                <form action={avancar} className="stack" style={{ gap: 10 }}>
                  <input type="hidden" name="id" value={m.id} />
                  <p className="small" style={{ margin: 0 }}>Vai para: <b>{NOME_ETAPA[previa.proxima]}</b>.{previa.proxima === "CONCLUIDA" ? " O aluno fica ativo e recebe o código de matrícula." : ""}</p>
                  <div className="actions" style={{ justifyContent: "flex-start" }}><button className="btn primary" type="submit">{BOTAO[m.etapa] ?? "Avançar"}</button></div>
                </form>
              ) : <div className="callout warn">{previa.erro}</div>}
            </section>
          )}
        </div>

        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 10 }}>Desconto</h2>
            {aberta ? (
              <form action={definirDesconto} className="stack" style={{ gap: 10 }}>
                <input type="hidden" name="id" value={m.id} />
                <div className="form">
                  <div className="field"><label htmlFor="desconto">Percentual</label><input className="input" id="desconto" name="desconto" type="number" min={0} max={100} defaultValue={m.descontoPct} /></div>
                  <div className="field"><label htmlFor="observacao">Justificativa</label><input className="input" id="observacao" name="observacao" defaultValue={m.observacao ?? ""} /></div>
                </div>
                {m.descontoPct > LIMITE_DESCONTO_SEM_APROVACAO && (
                  m.descontoAprovado ? <span className="pill p-good">Aprovado pela direção</span>
                  : podeAprovar ? <label className="check"><input type="checkbox" name="aprovar" /> Aprovar este desconto (direção)</label>
                  : <span className="pill p-warn">Aguardando aprovação da direção</span>
                )}
                <div className="actions"><button className="btn" type="submit">Salvar desconto</button></div>
              </form>
            ) : <p className="small" style={{ margin: 0 }}>{m.descontoPct}%{m.descontoAprovado ? ", aprovado" : ""}.</p>}
          </section>

          <section className="panel">
            <h2 style={{ marginBottom: 10 }}>Responsáveis</h2>
            <ul className="todo">
              {m.aluno.responsaveis.map((r) => (
                <li key={r.responsavelId}><span>{r.responsavel.nome} <span className="muted">({r.parentesco})</span></span>{r.financeiro && <span className="pill p-info">Financeiro</span>}</li>
              ))}
            </ul>
          </section>

          {m.observacao && <section className="panel"><h2 style={{ marginBottom: 8 }}>Observações</h2><p style={{ margin: 0, whiteSpace: "pre-line" }} className="small">{m.observacao}</p></section>}

          {aberta && (
            <details className="panel">
              <summary>Cancelar matrícula</summary>
              <form action={cancelar} className="stack" style={{ gap: 10 }}>
                <input type="hidden" name="id" value={m.id} />
                <div className="field"><label htmlFor="motivo">Motivo</label><input className="input" id="motivo" name="motivo" placeholder="Ex.: família desistiu por mudança de cidade" required /></div>
                <div className="actions"><button className="btn danger" type="submit">Cancelar matrícula</button></div>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  );
}
