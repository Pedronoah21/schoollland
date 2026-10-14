import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { FUSOS } from "@/lib/fusos";
import { NOME_PERFIL, type Perfil } from "@/lib/permissoes";
import { param } from "@/lib/retorno";
import { horaLocal } from "@/lib/tempo";
import { Aviso } from "@/components/Aviso";
import { alterarUsuario, criarUsuario, desativarCatraca, salvarEscola, virarAnoLetivo } from "./acoes";
import { NovaCatraca } from "./NovaCatraca";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eu = await exigir("config.escola");
  const sp = await searchParams;
  const escola = await obterEscola();
  const [usuarios, catracas, rematriculados] = await Promise.all([
    db.usuario.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }], select: { id: true, nome: true, email: true, perfil: true, ativo: true } }),
    db.dispositivo.findMany({ orderBy: { criadoEm: "desc" } }),
    db.matricula.count({ where: { ano: escola.anoLetivo + 1, etapa: "CONCLUIDA" } }),
  ]);

  return (
    <>
      <header className="top">
        <div><span className="eyebrow">Administração</span><h1>Configurações</h1><p>Dados da escola, acessos da equipe e catracas.</p></div>
        <Link className="btn" href="/configuracoes/auditoria">Ver auditoria</Link>
      </header>
      <Aviso ok={param(sp.ok)} erro={param(sp.erro)} />

      <div className="grid2">
        <section className="panel">
          <h2 style={{ marginBottom: 14 }}>Escola</h2>
          <form action={salvarEscola} className="form">
            <div className="field full"><label htmlFor="nome">Nome</label><input className="input" id="nome" name="nome" defaultValue={escola.nome} required /></div>
            <div className="field full">
              <label htmlFor="fuso">Fuso horário</label>
              <select className="select" id="fuso" name="fuso" defaultValue={escola.fuso}>{FUSOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <span className="hint">Define o horário da portaria e o que conta como atraso.</span>
            </div>
            <div className="actions field full"><button className="btn primary" type="submit">Salvar</button></div>
          </form>
        </section>
        <section className="panel">
          <h2 style={{ marginBottom: 6 }}>Ano letivo {escola.anoLetivo}</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Ao virar o ano, os {rematriculados} aluno(s) com rematrícula concluída para {escola.anoLetivo + 1} passam para as novas turmas. Os demais continuam como estão, para a secretaria decidir.</p>
          <form action={virarAnoLetivo} className="stack" style={{ gap: 10 }}>
            <label className="check"><input type="checkbox" name="confirmo" /> Confirmo que quero iniciar o ano letivo {escola.anoLetivo + 1}</label>
            <div className="actions"><button className="btn" type="submit">Virar para {escola.anoLetivo + 1}</button></div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Equipe</h2><span className="muted small">{usuarios.filter((x) => x.ativo).length} acessos ativos</span></div>
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((x) => (
                <tr key={x.id}>
                  <td>{x.nome}{x.id === eu.id && <span className="muted"> (você)</span>}</td>
                  <td>{x.email}</td>
                  <td>{NOME_PERFIL[x.perfil]}</td>
                  <td>{x.ativo ? <span className="pill p-good">Ativo</span> : <span className="pill p-mute">Desativado</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {x.id !== eu.id && (
                      <form action={alterarUsuario} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={x.id} /><input type="hidden" name="acao" value={x.ativo ? "desativar" : "ativar"} />
                        <button className="btn sm" type="submit">{x.ativo ? "Desativar" : "Reativar"}</button>
                      </form>
                    )}{" "}
                    <details style={{ display: "inline-block" }}>
                      <summary className="btn sm">Trocar senha</summary>
                      <form action={alterarUsuario} className="filters" style={{ marginTop: 8 }}>
                        <input type="hidden" name="id" value={x.id} /><input type="hidden" name="acao" value="senha" />
                        <input className="input" name="senha" type="password" minLength={10} required placeholder="Nova senha" aria-label={`Nova senha de ${x.nome}`} autoComplete="new-password" />
                        <button className="btn sm primary" type="submit">Salvar</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary className="btn sm">Novo acesso</summary>
          <form action={criarUsuario} className="form" style={{ marginTop: 12 }}>
            <div className="field"><label htmlFor="u_nome">Nome</label><input className="input" id="u_nome" name="nome" required /></div>
            <div className="field"><label htmlFor="u_email">E-mail</label><input className="input" id="u_email" name="email" type="email" required /></div>
            <div className="field">
              <label htmlFor="u_perfil">Perfil</label>
              <select className="select" id="u_perfil" name="perfil" defaultValue="SECRETARIA">
                {(Object.keys(NOME_PERFIL) as Perfil[]).map((p) => <option key={p} value={p}>{NOME_PERFIL[p]}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="u_senha">Senha inicial</label><input className="input" id="u_senha" name="senha" type="password" minLength={10} required autoComplete="new-password" /></div>
            <div className="actions field full"><button className="btn primary" type="submit">Criar acesso</button></div>
          </form>
        </details>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Catracas</h2><span className="muted small">Como integrar: arquivo docs/catraca.md do sistema</span></div>
        {catracas.length ? (
          <ul className="todo" style={{ marginBottom: 14 }}>
            {catracas.map((c) => (
              <li key={c.id}>
                <span>
                  <b style={{ fontFamily: "var(--f-body)" }}>{c.nome}</b>{" "}
                  {c.ativo ? <span className="pill p-good">Ativa</span> : <span className="pill p-mute">Desativada</span>}
                  <br />
                  <span className="small muted">{c.ultimoContato ? `Último contato: ${c.ultimoContato.toLocaleDateString("pt-BR", { timeZone: escola.fuso })} às ${horaLocal(c.ultimoContato, escola.fuso)}` : "Ainda não se conectou"}</span>
                </span>
                {c.ativo && (
                  <form action={desativarCatraca}><input type="hidden" name="id" value={c.id} /><button className="btn sm danger" type="submit">Desativar</button></form>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Nenhuma catraca cadastrada.</p>}
        <NovaCatraca />
      </section>
    </>
  );
}
