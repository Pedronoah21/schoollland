import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { pode } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { dataLocal, horaLocal, idade } from "@/lib/tempo";
import { formatarCpf, formatarTelefone } from "@/lib/documentos-br";
import { NOME_NIVEL, NOME_STATUS, formatarData, pillStatus } from "@/lib/rotulos";
import { exigeAcompanhante } from "@/lib/regras/portaria";
import { NOME_ETAPA } from "@/lib/regras/matricula";
import { Aviso } from "@/components/Aviso";
import { Avatar } from "@/components/Avatar";
import { rotuloPassagem } from "@/components/PassagemLinha";
import { adicionarAutorizado, adicionarResponsavel, alterarSituacao, autorizarSaidaHoje, editarAluno, removerAutorizado, removerResponsavel } from "../acoes";

export const metadata: Metadata = { title: "Ficha do aluno" };

export default async function FichaAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await exigir("alunos.ver");
  const { id } = await params;
  const sp = await searchParams;
  const escola = await obterEscola();
  const a = await db.aluno.findUnique({
    where: { id },
    include: {
      turma: true,
      responsaveis: { include: { responsavel: true }, orderBy: { financeiro: "desc" } },
      autorizados: { orderBy: { nome: "asc" } },
      passagens: { orderBy: { ocorridaEm: "desc" }, take: 10 },
      matriculas: { orderBy: { criadoEm: "desc" }, take: 3, include: { turma: { select: { nome: true } } } },
    },
  });
  if (!a) notFound();
  const editar = pode(u.perfil, "alunos.editar");
  const verSaude = pode(u.perfil, "alunos.saude");
  const turmas = editar ? await db.turma.findMany({ where: { ano: escola.anoLetivo }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }) : [];
  const hoje = dataLocal(new Date(), escola.fuso);
  const precisaAcomp = exigeAcompanhante(a.turma?.nivel ?? null);
  const nascISO = a.nascimento.toISOString().slice(0, 10);

  return (
    <>
      <header className="top">
        <div className="who" style={{ gap: 16 }}>
          <Avatar nome={a.nome} grande />
          <div>
            <span className="eyebrow"><Link href="/alunos">Alunos</Link></span>
            <h1>{a.nome}</h1>
            <p>
              {a.codigo ? <span className="mono">Matrícula {a.codigo}</span> : "Sem matrícula concluída"} · {a.turma ? `${a.turma.nome} (${NOME_NIVEL[a.turma.nivel]})` : "sem turma"} · {idade(a.nascimento, new Date())} anos{" "}
              <span className={`pill ${pillStatus(a.status)}`}>{NOME_STATUS[a.status]}</span>
            </p>
          </div>
        </div>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />
      {a.status === "INATIVO" && <div className="callout warn">Inativo: {a.motivoInativo ?? "sem motivo informado"}. A catraca bloqueia o acesso.</div>}
      {verSaude && a.alergias && <div className="callout bad"><b>Alergias:</b> {a.alergias}</div>}

      <div className="grid2">
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Responsáveis</h2></div>
            {a.responsaveis.length ? (
              <ul className="todo">
                {a.responsaveis.map((r) => (
                  <li key={r.responsavelId} style={{ alignItems: "flex-start" }}>
                    <span>
                      <b style={{ fontFamily: "var(--f-body)" }}>{r.responsavel.nome}</b> <span className="muted">({r.parentesco})</span>
                      <br />
                      <span className="small muted mono">{formatarTelefone(r.responsavel.telefone)} · CPF {formatarCpf(r.responsavel.cpf)}</span>
                      {r.responsavel.email && <><br /><span className="small muted">{r.responsavel.email}</span></>}
                      <br />
                      {r.financeiro && <span className="pill p-info">Financeiro</span>} {r.pedagogico && <span className="pill p-mute">Recebe avisos</span>}
                    </span>
                    {editar && (
                      <form action={removerResponsavel}>
                        <input type="hidden" name="alunoId" value={a.id} /><input type="hidden" name="responsavelId" value={r.responsavelId} />
                        <button className="btn link small" type="submit">Remover</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="empty">Nenhum responsável cadastrado.</p>}
            {editar && (
              <details style={{ marginTop: 14 }}>
                <summary className="btn sm">Adicionar responsável</summary>
                <form action={adicionarResponsavel} className="form" style={{ marginTop: 12 }}>
                  <input type="hidden" name="alunoId" value={a.id} />
                  <div className="field full"><label htmlFor="r_nome">Nome completo</label><input className="input" id="r_nome" name="nome" required /></div>
                  <div className="field"><label htmlFor="r_cpf">CPF</label><input className="input" id="r_cpf" name="cpf" inputMode="numeric" required /></div>
                  <div className="field"><label htmlFor="r_par">Parentesco</label><input className="input" id="r_par" name="parentesco" placeholder="mãe, pai, avó…" required /></div>
                  <div className="field"><label htmlFor="r_tel">Celular</label><input className="input" id="r_tel" name="telefone" inputMode="tel" required /></div>
                  <div className="field"><label htmlFor="r_email">E-mail</label><input className="input" id="r_email" name="email" type="email" /></div>
                  <label className="check"><input type="checkbox" name="financeiro" /> Responsável financeiro</label>
                  <label className="check"><input type="checkbox" name="pedagogico" defaultChecked /> Recebe avisos da escola</label>
                  <div className="actions field full"><button className="btn primary" type="submit">Vincular</button></div>
                </form>
              </details>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Saída</h2></div>
            <p style={{ margin: "0 0 10px" }} className="small">
              {precisaAcomp
                ? a.saidaAutorizadaEm === hoje
                  ? <span className="pill p-good">Hoje pode sair sem acompanhante</span>
                  : "Só sai acompanhado de uma pessoa da lista abaixo."
                : "Pode sair sozinho. Os responsáveis recebem o aviso de saída."}
            </p>
            {a.autorizados.length ? (
              <ul className="todo">
                {a.autorizados.map((p) => (
                  <li key={p.id}>
                    <span>{p.nome} <span className="muted">({p.parentesco}{p.documento ? ` · doc. ${p.documento}` : ""})</span></span>
                    {editar && (
                      <form action={removerAutorizado}>
                        <input type="hidden" name="alunoId" value={a.id} /><input type="hidden" name="id" value={p.id} />
                        <button className="btn link small" type="submit">Remover</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="muted small">Nenhuma pessoa autorizada além dos responsáveis cadastrados.</p>}
            {editar && (
              <div className="stack" style={{ gap: 12, marginTop: 14 }}>
                <details>
                  <summary className="btn sm">Autorizar outra pessoa a buscar</summary>
                  <form action={adicionarAutorizado} className="form" style={{ marginTop: 12 }}>
                    <input type="hidden" name="alunoId" value={a.id} />
                    <div className="field"><label htmlFor="au_nome">Nome</label><input className="input" id="au_nome" name="nome" required /></div>
                    <div className="field"><label htmlFor="au_par">Parentesco ou relação</label><input className="input" id="au_par" name="parentesco" placeholder="avó, motorista da van…" required /></div>
                    <div className="field full"><label htmlFor="au_doc">Documento (opcional)</label><input className="input" id="au_doc" name="documento" /></div>
                    <div className="actions field full"><button className="btn primary" type="submit">Autorizar</button></div>
                  </form>
                </details>
                {precisaAcomp && a.saidaAutorizadaEm !== hoje && (
                  <details>
                    <summary className="btn sm">Registrar autorização de saída sozinho hoje</summary>
                    <form action={autorizarSaidaHoje} className="stack" style={{ gap: 10, marginTop: 12 }}>
                      <input type="hidden" name="id" value={a.id} />
                      <div className="field"><label htmlFor="sa_quem">Quem autorizou e como</label><input className="input" id="sa_quem" name="quem" placeholder="Ex.: mãe, por telefone às 10h" required /></div>
                      <div className="actions"><button className="btn primary" type="submit">Registrar</button></div>
                    </form>
                  </details>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Últimas passagens</h2></div>
            {a.passagens.length ? (
              <ul className="todo">
                {a.passagens.map((p) => (
                  <li key={p.id}>
                    <span className="mono small">{p.dataLocal.split("-").reverse().join("/")} {horaLocal(p.ocorridaEm, escola.fuso)}</span>
                    <span>{rotuloPassagem(p)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">Nenhuma passagem registrada.</p>}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Dados do aluno</h2>
            {editar ? (
              <form action={editarAluno} className="form">
                <input type="hidden" name="id" value={a.id} />
                <div className="field full"><label htmlFor="nome">Nome completo</label><input className="input" id="nome" name="nome" defaultValue={a.nome} required /></div>
                <div className="field"><label htmlFor="nascimento">Nascimento</label><input className="input" id="nascimento" name="nascimento" type="date" defaultValue={nascISO} required /></div>
                <div className="field"><label htmlFor="cpf">CPF do aluno (opcional)</label><input className="input" id="cpf" name="cpf" defaultValue={a.cpf ? formatarCpf(a.cpf) : ""} inputMode="numeric" /></div>
                <div className="field">
                  <label htmlFor="turmaId">Turma</label>
                  <select className="select" id="turmaId" name="turmaId" defaultValue={a.turmaId ?? ""}>
                    <option value="">Sem turma</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="cartao">Cartão da catraca</label><input className="input mono" id="cartao" name="cartao" defaultValue={a.cartao ?? ""} placeholder="Número do cartão" /></div>
                {verSaude && (
                  <>
                    <div className="field full"><label htmlFor="alergias">Alergias</label><input className="input" id="alergias" name="alergias" defaultValue={a.alergias ?? ""} placeholder="Deixe em branco se não houver" /></div>
                    <div className="field full"><label htmlFor="saude">Outras informações de saúde</label><textarea className="input" id="saude" name="saude" rows={3} defaultValue={a.saude ?? ""} /></div>
                  </>
                )}
                <div className="actions field full"><button className="btn primary" type="submit">Salvar</button></div>
              </form>
            ) : (
              <dl className="dl">
                <dt>Nascimento</dt><dd>{formatarData(a.nascimento)}</dd>
                <dt>Turma</dt><dd>{a.turma?.nome ?? "—"}</dd>
                <dt>Cartão</dt><dd className="mono">{a.cartao ?? "—"}</dd>
                {verSaude && <><dt>Saúde</dt><dd>{a.saude ?? "—"}</dd></>}
              </dl>
            )}
          </section>

          {a.matriculas.length > 0 && (
            <section className="panel">
              <h2 style={{ marginBottom: 10 }}>Matrículas</h2>
              <ul className="todo">
                {a.matriculas.map((m) => (
                  <li key={m.id}><Link href={`/matriculas/${m.id}`}>{m.ano} · {m.turma.nome}</Link><span className="small">{NOME_ETAPA[m.etapa]}</span></li>
                ))}
              </ul>
            </section>
          )}

          {editar && a.status !== "PENDENTE" && (
            <section className="panel">
              <h2 style={{ marginBottom: 10 }}>Situação</h2>
              {a.status === "ATIVO" && pode(u.perfil, "matriculas") && (
                <p style={{ marginTop: 0 }}><Link className="btn sm" href={`/matriculas/nova?aluno=${a.id}`}>Rematricular para {escola.anoLetivo + 1}</Link></p>
              )}
              {a.status === "ATIVO" ? (
                <form action={alterarSituacao} className="stack" style={{ gap: 10 }}>
                  <input type="hidden" name="id" value={a.id} /><input type="hidden" name="acao" value="inativar" />
                  <div className="field"><label htmlFor="motivo">Motivo da inativação</label><input className="input" id="motivo" name="motivo" placeholder="Ex.: transferido para outra escola em 30/09" required /></div>
                  <div className="actions"><button className="btn danger" type="submit">Inativar aluno</button></div>
                </form>
              ) : (
                <form action={alterarSituacao}>
                  <input type="hidden" name="id" value={a.id} /><input type="hidden" name="acao" value="reativar" />
                  <button className="btn" type="submit">Reativar aluno</button>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
