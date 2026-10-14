"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { obterEscola } from "@/lib/escola";
import { campo, marcado, voltar } from "@/lib/retorno";
import { cpfValido, soDigitos, telefoneValido } from "@/lib/documentos-br";
import { dataLocal } from "@/lib/tempo";

const pagina = (id: string) => `/alunos/${id}`;

function lerData(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function editarAluno(fd: FormData) {
  const u = await exigir("alunos.editar");
  const id = campo(fd, "id");
  const volta = pagina(id);
  const nome = campo(fd, "nome");
  const nascimento = lerData(campo(fd, "nascimento"));
  const cpf = soDigitos(campo(fd, "cpf"));
  const turmaId = campo(fd, "turmaId") || null;
  const cartao = campo(fd, "cartao") || null;
  if (nome.split(/\s+/).length < 2) voltar(volta, { erro: "Informe nome e sobrenome." });
  if (!nascimento || nascimento > new Date()) voltar(volta, { erro: "Data de nascimento inválida." });
  if (cpf && !cpfValido(cpf)) voltar(volta, { erro: "CPF do aluno inválido." });

  const atual = await db.aluno.findUnique({ where: { id } });
  if (!atual) voltar("/alunos", { erro: "Aluno não encontrado." });
  if (turmaId && turmaId !== atual.turmaId && atual.status === "ATIVO") {
    const t = await db.turma.findUnique({ where: { id: turmaId }, include: { _count: { select: { alunos: { where: { status: "ATIVO" } } } } } });
    if (!t) voltar(volta, { erro: "Turma não encontrada." });
    if (t._count.alunos >= t.capacidade) voltar(volta, { erro: `A turma ${t.nome} está lotada.` });
  }

  const dados = {
    nome, nascimento, cpf: cpf || null, turmaId, cartao,
    alergias: campo(fd, "alergias") || null,
    saude: campo(fd, "saude") || null,
  };
  try {
    await db.aluno.update({ where: { id }, data: dados });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") voltar(volta, { erro: "Este cartão já está ligado a outro aluno." });
    throw e;
  }
  const mudou = Object.fromEntries(
    Object.entries(dados).filter(([k, v]) => String((atual as unknown as Record<string, unknown>)[k] ?? "") !== String(v ?? "")).map(([k]) => [k, true]),
  );
  await auditar(u.id, "aluno.editado", "Aluno", id, { campos: Object.keys(mudou) });
  revalidatePath(volta);
  voltar(volta, { ok: "Dados do aluno salvos." });
}

export async function adicionarResponsavel(fd: FormData) {
  const u = await exigir("alunos.editar");
  const alunoId = campo(fd, "alunoId");
  const volta = pagina(alunoId);
  const nome = campo(fd, "nome");
  const cpf = soDigitos(campo(fd, "cpf"));
  const telefone = soDigitos(campo(fd, "telefone"));
  const email = campo(fd, "email").toLowerCase() || null;
  const parentesco = campo(fd, "parentesco");
  if (nome.split(/\s+/).length < 2) voltar(volta, { erro: "Informe nome e sobrenome do responsável." });
  if (!cpfValido(cpf)) voltar(volta, { erro: "CPF do responsável inválido." });
  if (!telefoneValido(telefone)) voltar(volta, { erro: "Informe o telefone com DDD." });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) voltar(volta, { erro: "Confira o e-mail." });
  if (!parentesco) voltar(volta, { erro: "Informe o parentesco." });

  const resp = await db.responsavel.upsert({
    where: { cpf },
    create: { nome, cpf, telefone, email },
    update: { nome, telefone, ...(email ? { email } : {}) },
  });
  const financeiro = marcado(fd, "financeiro");
  await db.$transaction(async (tx) => {
    if (financeiro) await tx.alunoResponsavel.updateMany({ where: { alunoId }, data: { financeiro: false } });
    await tx.alunoResponsavel.upsert({
      where: { alunoId_responsavelId: { alunoId, responsavelId: resp.id } },
      create: { alunoId, responsavelId: resp.id, parentesco, financeiro, pedagogico: marcado(fd, "pedagogico") },
      update: { parentesco, financeiro, pedagogico: marcado(fd, "pedagogico") },
    });
  });
  await auditar(u.id, "aluno.responsavel_vinculado", "Aluno", alunoId, { responsavelId: resp.id, financeiro });
  revalidatePath(volta);
  voltar(volta, { ok: `${nome} vinculado ao aluno.` });
}

export async function removerResponsavel(fd: FormData) {
  const u = await exigir("alunos.editar");
  const alunoId = campo(fd, "alunoId");
  const responsavelId = campo(fd, "responsavelId");
  const volta = pagina(alunoId);
  const vinculos = await db.alunoResponsavel.findMany({ where: { alunoId } });
  if (vinculos.length <= 1) voltar(volta, { erro: "O aluno precisa ter pelo menos um responsável." });
  const alvo = vinculos.find((v) => v.responsavelId === responsavelId);
  if (alvo?.financeiro) voltar(volta, { erro: "Defina outro responsável financeiro antes de remover este." });
  await db.alunoResponsavel.delete({ where: { alunoId_responsavelId: { alunoId, responsavelId } } });
  await auditar(u.id, "aluno.responsavel_removido", "Aluno", alunoId, { responsavelId });
  revalidatePath(volta);
  voltar(volta, { ok: "Responsável removido deste aluno." });
}

export async function adicionarAutorizado(fd: FormData) {
  const u = await exigir("alunos.editar");
  const alunoId = campo(fd, "alunoId");
  const volta = pagina(alunoId);
  const nome = campo(fd, "nome");
  const parentesco = campo(fd, "parentesco");
  if (nome.length < 3 || !parentesco) voltar(volta, { erro: "Informe nome e parentesco de quem pode buscar." });
  const a = await db.autorizado.create({ data: { alunoId, nome, parentesco, documento: campo(fd, "documento") || null } });
  await auditar(u.id, "aluno.autorizado_incluido", "Aluno", alunoId, { autorizadoId: a.id, nome });
  revalidatePath(volta);
  voltar(volta, { ok: `${nome} pode buscar o aluno.` });
}

export async function removerAutorizado(fd: FormData) {
  const u = await exigir("alunos.editar");
  const alunoId = campo(fd, "alunoId");
  const id = campo(fd, "id");
  const a = await db.autorizado.findFirst({ where: { id, alunoId } });
  if (a) {
    await db.autorizado.delete({ where: { id } });
    await auditar(u.id, "aluno.autorizado_removido", "Aluno", alunoId, { nome: a.nome });
  }
  revalidatePath(pagina(alunoId));
  voltar(pagina(alunoId), { ok: "Autorização removida." });
}

export async function alterarSituacao(fd: FormData) {
  const u = await exigir("alunos.editar");
  const id = campo(fd, "id");
  const volta = pagina(id);
  const acao = campo(fd, "acao");
  const motivo = campo(fd, "motivo");
  const aluno = await db.aluno.findUnique({ where: { id } });
  if (!aluno) voltar("/alunos", { erro: "Aluno não encontrado." });
  if (acao === "inativar") {
    if (motivo.length < 5) voltar(volta, { erro: "Informe o motivo (por exemplo, transferido para outra escola)." });
    await db.aluno.update({ where: { id }, data: { status: "INATIVO", motivoInativo: motivo } });
    await auditar(u.id, "aluno.inativado", "Aluno", id, { motivo });
    revalidatePath(volta);
    voltar(volta, { ok: "Aluno inativado. A catraca passa a bloquear o acesso." });
  }
  if (acao === "reativar") {
    if (!aluno.codigo) voltar(volta, { erro: "Este aluno nunca teve matrícula concluída. Use a tela de matrículas." });
    await db.aluno.update({ where: { id }, data: { status: "ATIVO", motivoInativo: null } });
    await auditar(u.id, "aluno.reativado", "Aluno", id);
    revalidatePath(volta);
    voltar(volta, { ok: "Aluno reativado." });
  }
  voltar(volta, { erro: "Ação desconhecida." });
}

/** Registra a autorização do responsável (por telefone, por exemplo) para sair sem acompanhante hoje */
export async function autorizarSaidaHoje(fd: FormData) {
  const u = await exigir("alunos.editar");
  const id = campo(fd, "id");
  const quem = campo(fd, "quem");
  if (quem.length < 3) voltar(pagina(id), { erro: "Informe quem autorizou e por qual meio." });
  const escola = await obterEscola();
  const hoje = dataLocal(new Date(), escola.fuso);
  await db.aluno.update({ where: { id }, data: { saidaAutorizadaEm: hoje } });
  await auditar(u.id, "aluno.saida_autorizada", "Aluno", id, { data: hoje, quem });
  revalidatePath(pagina(id));
  voltar(pagina(id), { ok: "Saída sem acompanhante autorizada para hoje." });
}
