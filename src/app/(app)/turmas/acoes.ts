"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Nivel, type Turno } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { campo, voltar } from "@/lib/retorno";
import { horaParaMinutos } from "@/lib/tempo";
import { NOME_NIVEL, NOME_TURNO } from "@/lib/rotulos";

function lerTurma(fd: FormData, volta: string) {
  const nome = campo(fd, "nome");
  const nivel = campo(fd, "nivel") as Nivel;
  const turno = campo(fd, "turno") as Turno;
  const ano = Number(campo(fd, "ano"));
  const capacidade = Number(campo(fd, "capacidade"));
  const entrada = campo(fd, "entrada");
  const toleranciaMin = Number(campo(fd, "tolerancia"));
  if (nome.length < 2) voltar(volta, { erro: "Informe o nome da turma." });
  if (!(nivel in NOME_NIVEL) || !(turno in NOME_TURNO)) voltar(volta, { erro: "Escolha o segmento e o turno." });
  if (!Number.isInteger(ano) || ano < 2020 || ano > 2100) voltar(volta, { erro: "Ano letivo inválido." });
  if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 80) voltar(volta, { erro: "A capacidade deve ficar entre 1 e 80 alunos." });
  try { horaParaMinutos(entrada); } catch { voltar(volta, { erro: "Horário de entrada inválido. Use o formato 07:00." }); }
  if (!Number.isInteger(toleranciaMin) || toleranciaMin < 0 || toleranciaMin > 60) voltar(volta, { erro: "A tolerância deve ficar entre 0 e 60 minutos." });
  return { nome, nivel, turno, ano, capacidade, entrada, toleranciaMin };
}

export async function criarTurma(fd: FormData) {
  const u = await exigir("turmas.editar");
  const dados = lerTurma(fd, "/turmas");
  try {
    const t = await db.turma.create({ data: dados });
    await auditar(u.id, "turma.criada", "Turma", t.id, dados);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") voltar("/turmas", { erro: `Já existe a turma ${dados.nome} em ${dados.ano}.` });
    throw e;
  }
  revalidatePath("/turmas");
  voltar("/turmas", { ok: `Turma ${dados.nome} criada.` });
}

export async function editarTurma(fd: FormData) {
  const u = await exigir("turmas.editar");
  const id = campo(fd, "id");
  const volta = `/turmas/${id}`;
  const dados = lerTurma(fd, volta);
  const ativos = await db.aluno.count({ where: { turmaId: id, status: "ATIVO" } });
  if (dados.capacidade < ativos) voltar(volta, { erro: `A turma já tem ${ativos} alunos ativos; a capacidade não pode ser menor.` });
  try {
    await db.turma.update({ where: { id }, data: dados });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") voltar(volta, { erro: `Já existe a turma ${dados.nome} em ${dados.ano}.` });
    throw e;
  }
  await auditar(u.id, "turma.editada", "Turma", id, dados);
  revalidatePath("/turmas");
  voltar(volta, { ok: "Turma atualizada." });
}
