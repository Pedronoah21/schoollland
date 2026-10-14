"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { Nivel } from "@prisma/client";
import { db } from "@/lib/db";
import { criarSessao } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { campo, marcado, voltar } from "@/lib/retorno";
import { FUSOS } from "@/lib/fusos";


const TURMAS_PADRAO: { nome: string; nivel: Nivel; capacidade: number }[] = [
  { nome: "Infantil II A", nivel: "INFANTIL", capacidade: 18 },
  { nome: "1º ano A", nivel: "FUND1", capacidade: 25 },
  { nome: "2º ano A", nivel: "FUND1", capacidade: 25 },
  { nome: "3º ano A", nivel: "FUND1", capacidade: 28 },
  { nome: "4º ano A", nivel: "FUND1", capacidade: 28 },
  { nome: "5º ano A", nivel: "FUND1", capacidade: 30 },
  { nome: "6º ano A", nivel: "FUND2", capacidade: 32 },
  { nome: "7º ano A", nivel: "FUND2", capacidade: 32 },
  { nome: "8º ano A", nivel: "FUND2", capacidade: 32 },
  { nome: "9º ano A", nivel: "FUND2", capacidade: 32 },
  { nome: "1ª série EM", nivel: "MEDIO", capacidade: 35 },
  { nome: "2ª série EM", nivel: "MEDIO", capacidade: 35 },
  { nome: "3ª série EM", nivel: "MEDIO", capacidade: 35 },
];

export async function configurarEscola(fd: FormData) {
  const escola = campo(fd, "escola");
  const ano = Number(campo(fd, "ano"));
  const fuso = campo(fd, "fuso");
  const nome = campo(fd, "nome");
  const email = campo(fd, "email").toLowerCase();
  const senha = campo(fd, "senha");

  if (escola.length < 3 || nome.length < 3) voltar("/primeiro-acesso", { erro: "Preencha o nome da escola e o seu nome." });
  if (!Number.isInteger(ano) || ano < 2020 || ano > 2100) voltar("/primeiro-acesso", { erro: "Ano letivo inválido." });
  if (!FUSOS.some(([v]) => v === fuso)) voltar("/primeiro-acesso", { erro: "Escolha o fuso horário." });
  if (!/^\S+@\S+\.\S+$/.test(email)) voltar("/primeiro-acesso", { erro: "Confira o e-mail." });
  if (senha.length < 10) voltar("/primeiro-acesso", { erro: "A senha precisa ter pelo menos 10 caracteres." });
  if (senha !== campo(fd, "senha2")) voltar("/primeiro-acesso", { erro: "As senhas não conferem." });

  const senhaHash = await bcrypt.hash(senha, 12);
  const criado = await db.$transaction(async (tx) => {
    if ((await tx.usuario.count()) > 0) return null;
    await tx.escola.upsert({ where: { id: 1 }, create: { id: 1, nome: escola, anoLetivo: ano, fuso }, update: { nome: escola, anoLetivo: ano, fuso } });
    if (marcado(fd, "turmasPadrao")) {
      await tx.turma.createMany({ data: TURMAS_PADRAO.map((t) => ({ ...t, ano, turno: "MANHA" as const })), skipDuplicates: true });
    }
    return tx.usuario.create({ data: { nome, email, senhaHash, perfil: "ADMIN" } });
  });
  if (!criado) redirect("/login");

  await auditar(criado.id, "escola.configurada", "Escola", "1", { escola, ano, fuso });
  await criarSessao(criado.id);
  redirect("/painel");
}
