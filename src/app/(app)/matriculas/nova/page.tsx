import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { param } from "@/lib/retorno";
import { ETAPAS_EM_ANDAMENTO, LIMITE_DESCONTO_SEM_APROVACAO, vagasLivres } from "@/lib/regras/matricula";
import { Aviso } from "@/components/Aviso";
import { criarMatricula } from "../acoes";

export const metadata: Metadata = { title: "Nova matrícula" };

export default async function NovaMatricula({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigir("matriculas");
  const sp = await searchParams;
  const escola = await obterEscola();
  const alunoId = param(sp.aluno);
  const aluno = alunoId ? await db.aluno.findUnique({ where: { id: alunoId }, include: { turma: true } }) : null;
  const turmas = await db.turma.findMany({
    where: { ano: { in: [escola.anoLetivo, escola.anoLetivo + 1] } },
    orderBy: [{ ano: "asc" }, { nome: "asc" }],
    include: { _count: { select: { alunos: { where: { status: "ATIVO" } }, matriculas: { where: { etapa: { in: ETAPAS_EM_ANDAMENTO } } } } } },
  });
  const anos = [...new Set(turmas.map((t) => t.ano))];

  return (
    <>
      <header className="top">
        <div>
          <span className="eyebrow"><Link href="/matriculas">Matrículas</Link></span>
          <h1>{aluno ? `Rematrícula de ${aluno.nome}` : "Nova matrícula"}</h1>
          <p>{aluno ? `Hoje em ${aluno.turma?.nome ?? "nenhuma turma"}. Escolha a turma e o desconto.` : "Aluno e responsável financeiro. Os demais responsáveis e autorizados entram depois, na ficha do aluno."}</p>
        </div>
      </header>
      <Aviso erro={param(sp.erro)} />
      <form action={criarMatricula} className="stack">
        {aluno ? <input type="hidden" name="alunoId" value={aluno.id} /> : (
          <>
            <section className="panel">
              <h2 style={{ marginBottom: 14 }}>Aluno</h2>
              <div className="form">
                <div className="field full"><label htmlFor="aluno_nome">Nome completo</label><input className="input" id="aluno_nome" name="aluno_nome" required /></div>
                <div className="field"><label htmlFor="aluno_nascimento">Data de nascimento</label><input className="input" id="aluno_nascimento" name="aluno_nascimento" type="date" required /></div>
                <div className="field"><label htmlFor="aluno_alergias">Alergias</label><input className="input" id="aluno_alergias" name="aluno_alergias" placeholder="Deixe em branco se não houver" /></div>
              </div>
            </section>
            <section className="panel">
              <h2 style={{ marginBottom: 14 }}>Responsável financeiro</h2>
              <div className="form">
                <div className="field full"><label htmlFor="resp_nome">Nome completo</label><input className="input" id="resp_nome" name="resp_nome" required /></div>
                <div className="field"><label htmlFor="resp_cpf">CPF</label><input className="input" id="resp_cpf" name="resp_cpf" inputMode="numeric" required /></div>
                <div className="field"><label htmlFor="resp_parentesco">Parentesco</label><input className="input" id="resp_parentesco" name="resp_parentesco" placeholder="mãe, pai, avó…" required /></div>
                <div className="field"><label htmlFor="resp_telefone">Celular (WhatsApp)</label><input className="input" id="resp_telefone" name="resp_telefone" inputMode="tel" placeholder="(92) 90000-0000" required /></div>
                <div className="field"><label htmlFor="resp_email">E-mail</label><input className="input" id="resp_email" name="resp_email" type="email" /><span className="hint">Recebe o contrato e, na Fase 3, os boletos.</span></div>
              </div>
            </section>
          </>
        )}
        <section className="panel">
          <h2 style={{ marginBottom: 14 }}>Turma e condições</h2>
          {turmas.length === 0 && <div className="callout warn" style={{ marginBottom: 12 }}>Nenhuma turma cadastrada para {escola.anoLetivo} ou {escola.anoLetivo + 1}. <Link href="/turmas">Crie as turmas</Link> antes.</div>}
          <div className="form">
            <div className="field full">
              <label htmlFor="turmaId">Turma</label>
              <select className="select" id="turmaId" name="turmaId" required defaultValue="">
                <option value="" disabled>Escolha a turma</option>
                {anos.map((ano) => (
                  <optgroup key={ano} label={`Ano letivo ${ano}`}>
                    {turmas.filter((t) => t.ano === ano).map((t) => {
                      const livres = vagasLivres(t.capacidade, t._count.alunos, t._count.matriculas);
                      return <option key={t.id} value={t.id} disabled={livres === 0}>{t.nome} · {livres === 0 ? "lotada" : `${livres} vaga${livres === 1 ? "" : "s"}`}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="desconto">Desconto (%)</label>
              <input className="input" id="desconto" name="desconto" type="number" min={0} max={100} defaultValue={0} />
              <span className="hint">Acima de {LIMITE_DESCONTO_SEM_APROVACAO}%, a direção precisa aprovar.</span>
            </div>
            <div className="field">
              <label htmlFor="observacao">Observação</label>
              <input className="input" id="observacao" name="observacao" placeholder="Ex.: irmão matriculado, bolsa, convênio" />
            </div>
          </div>
        </section>
        <div className="actions"><Link className="btn" href="/matriculas">Cancelar</Link><button className="btn primary" type="submit">Criar matrícula</button></div>
      </form>
    </>
  );
}
