"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { pode } from "@/lib/permissoes";
import { auditar } from "@/lib/auditoria";
import { obterEscola } from "@/lib/escola";
import { campo, marcado, voltar } from "@/lib/retorno";
import { cpfValido, soDigitos, telefoneValido } from "@/lib/documentos-br";
import { ETAPAS_EM_ANDAMENTO, NOME_ETAPA, avancarEtapa, codigoMatricula, vagasLivres } from "@/lib/regras/matricula";

const pagina = (id: string) => `/matriculas/${id}`;

async function vagasDaTurma(turmaId: string) {
  const t = await db.turma.findUnique({
    where: { id: turmaId },
    include: { _count: { select: { alunos: { where: { status: "ATIVO" } }, matriculas: { where: { etapa: { in: ETAPAS_EM_ANDAMENTO } } } } } },
  });
  if (!t) return null;
  return { turma: t, livres: vagasLivres(t.capacidade, t._count.alunos, t._count.matriculas) };
}

export async function criarMatricula(fd: FormData) {
  const u = await exigir("matriculas");
  const alunoExistente = campo(fd, "alunoId");
  const volta = alunoExistente ? `/matriculas/nova?aluno=${alunoExistente}` : "/matriculas/nova";
  const turmaId = campo(fd, "turmaId");
  const descontoPct = Number(campo(fd, "desconto") || "0");
  const observacao = campo(fd, "observacao") || null;
  if (!Number.isInteger(descontoPct) || descontoPct < 0 || descontoPct > 100) voltar(volta, { erro: "Desconto deve ser um número de 0 a 100." });

  const vagas = await vagasDaTurma(turmaId);
  if (!vagas) voltar(volta, { erro: "Escolha a turma." });
  if (vagas.livres <= 0) voltar(volta, { erro: `A turma ${vagas.turma.nome} não tem vagas livres.` });

  let alunoId = alunoExistente;
  if (alunoExistente) {
    const a = await db.aluno.findUnique({ where: { id: alunoExistente } });
    if (!a) voltar("/matriculas", { erro: "Aluno não encontrado." });
    const jaTem = await db.matricula.findFirst({ where: { alunoId: a.id, ano: vagas.turma.ano, etapa: { not: "CANCELADA" } } });
    if (jaTem) voltar(pagina(jaTem.id), { erro: `${a.nome} já tem matrícula para ${vagas.turma.ano}.` });
  } else {
    const nome = campo(fd, "aluno_nome");
    const nasc = campo(fd, "aluno_nascimento");
    const rNome = campo(fd, "resp_nome");
    const cpf = soDigitos(campo(fd, "resp_cpf"));
    const tel = soDigitos(campo(fd, "resp_telefone"));
    const email = campo(fd, "resp_email").toLowerCase() || null;
    const parentesco = campo(fd, "resp_parentesco");
    if (nome.split(/\s+/).length < 2) voltar(volta, { erro: "Informe nome e sobrenome do aluno." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc) || new Date(`${nasc}T00:00:00Z`) > new Date()) voltar(volta, { erro: "Data de nascimento inválida." });
    if (rNome.split(/\s+/).length < 2) voltar(volta, { erro: "Informe nome e sobrenome do responsável financeiro." });
    if (!cpfValido(cpf)) voltar(volta, { erro: "CPF do responsável inválido." });
    if (!telefoneValido(tel)) voltar(volta, { erro: "Informe o celular do responsável com DDD." });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) voltar(volta, { erro: "Confira o e-mail do responsável." });
    if (!parentesco) voltar(volta, { erro: "Informe o parentesco do responsável." });

    alunoId = await db.$transaction(async (tx) => {
      const resp = await tx.responsavel.upsert({ where: { cpf }, create: { nome: rNome, cpf, telefone: tel, email }, update: { nome: rNome, telefone: tel, ...(email ? { email } : {}) } });
      const a = await tx.aluno.create({ data: { nome, nascimento: new Date(`${nasc}T00:00:00Z`), alergias: campo(fd, "aluno_alergias") || null } });
      await tx.alunoResponsavel.create({ data: { alunoId: a.id, responsavelId: resp.id, parentesco, financeiro: true, pedagogico: true } });
      return a.id;
    });
    await auditar(u.id, "aluno.criado", "Aluno", alunoId, { nome });
  }

  const m = await db.matricula.create({ data: { alunoId, turmaId, ano: vagas.turma.ano, descontoPct, observacao } });
  await auditar(u.id, "matricula.criada", "Matricula", m.id, { turma: vagas.turma.nome, descontoPct });
  revalidatePath("/matriculas");
  redirect(`${pagina(m.id)}?ok=${encodeURIComponent("Matrícula criada. Confira os documentos para seguir.")}`);
}

export async function salvarDocumentos(fd: FormData) {
  const u = await exigir("matriculas");
  const id = campo(fd, "id");
  const dados = {
    docCertidao: marcado(fd, "docCertidao"),
    docResponsavel: marcado(fd, "docResponsavel"),
    docResidencia: marcado(fd, "docResidencia"),
    docHistorico: marcado(fd, "docHistorico"),
    docVacina: marcado(fd, "docVacina"),
  };
  await db.matricula.update({ where: { id }, data: dados });
  await auditar(u.id, "matricula.documentos", "Matricula", id, dados);
  revalidatePath(pagina(id));
  voltar(pagina(id), { ok: "Documentos atualizados." });
}

export async function definirDesconto(fd: FormData) {
  const u = await exigir("matriculas");
  const id = campo(fd, "id");
  const pct = Number(campo(fd, "desconto"));
  const aprovar = marcado(fd, "aprovar");
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) voltar(pagina(id), { erro: "Desconto deve ser um número de 0 a 100." });
  if (aprovar && !pode(u.perfil, "matriculas.aprovarDesconto")) voltar(pagina(id), { erro: "Só a direção pode aprovar descontos." });
  const atual = await db.matricula.findUnique({ where: { id } });
  if (!atual) voltar("/matriculas", { erro: "Matrícula não encontrada." });
  // Mudar o percentual desfaz a aprovação anterior
  const aprovado = aprovar || (atual.descontoAprovado && atual.descontoPct === pct);
  await db.matricula.update({ where: { id }, data: { descontoPct: pct, descontoAprovado: aprovado, observacao: campo(fd, "observacao") || atual.observacao } });
  await auditar(u.id, aprovar ? "matricula.desconto_aprovado" : "matricula.desconto_definido", "Matricula", id, { pct });
  revalidatePath(pagina(id));
  voltar(pagina(id), { ok: aprovar ? `Desconto de ${pct}% aprovado.` : "Desconto salvo." });
}

export async function avancar(fd: FormData) {
  const u = await exigir("matriculas");
  const id = campo(fd, "id");
  const m = await db.matricula.findUnique({ where: { id }, include: { turma: true, aluno: true } });
  if (!m) voltar("/matriculas", { erro: "Matrícula não encontrada." });
  const r = avancarEtapa({ ...m, nivel: m.turma.nivel });
  if (!r.ok) voltar(pagina(id), { erro: r.erro });

  if (r.proxima !== "CONCLUIDA") {
    await db.matricula.update({ where: { id }, data: { etapa: r.proxima } });
    await auditar(u.id, "matricula.etapa", "Matricula", id, { de: m.etapa, para: r.proxima });
    revalidatePath("/matriculas");
    voltar(pagina(id), { ok: `Matrícula em "${NOME_ETAPA[r.proxima]}".` });
  }

  // Conclusão: ativa o aluno, gera o código e (se for o ano atual) coloca na turma
  const escola = await obterEscola();
  const anoFuturo = m.ano > escola.anoLetivo && m.aluno.status === "ATIVO";
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      await db.$transaction(async (tx) => {
        let codigo = m.aluno.codigo;
        if (!codigo) {
          const usados = await tx.aluno.count({ where: { codigo: { startsWith: `${m.ano}-` } } });
          codigo = codigoMatricula(m.ano, usados + 1 + tentativa);
        }
        await tx.aluno.update({
          where: { id: m.alunoId },
          data: { codigo, ...(anoFuturo ? {} : { status: "ATIVO", turmaId: m.turmaId, motivoInativo: null }) },
        });
        await tx.matricula.update({ where: { id }, data: { etapa: "CONCLUIDA" } });
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && tentativa < 4) continue;
      throw e;
    }
  }
  await auditar(u.id, "matricula.concluida", "Matricula", id, { aluno: m.aluno.nome, turma: m.turma.nome });
  revalidatePath("/matriculas");
  voltar(pagina(id), {
    ok: anoFuturo
      ? `Rematrícula concluída. ${m.aluno.nome} vai para ${m.turma.nome} na virada para ${m.ano}.`
      : `Matrícula concluída. ${m.aluno.nome} está ativo em ${m.turma.nome} e já passa na catraca.`,
  });
}

export async function cancelar(fd: FormData) {
  const u = await exigir("matriculas");
  const id = campo(fd, "id");
  const motivo = campo(fd, "motivo");
  if (motivo.length < 5) voltar(pagina(id), { erro: "Informe o motivo do cancelamento." });
  const m = await db.matricula.findUnique({ where: { id } });
  if (!m || !ETAPAS_EM_ANDAMENTO.includes(m.etapa)) voltar(pagina(id), { erro: "Só matrículas em andamento podem ser canceladas." });
  await db.matricula.update({ where: { id }, data: { etapa: "CANCELADA", observacao: [m.observacao, `Cancelada: ${motivo}`].filter(Boolean).join("\n") } });
  await auditar(u.id, "matricula.cancelada", "Matricula", id, { motivo });
  revalidatePath("/matriculas");
  voltar(pagina(id), { ok: "Matrícula cancelada. A vaga foi liberada." });
}
