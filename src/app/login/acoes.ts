"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao, usuarioAtual } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { campo, voltar } from "@/lib/retorno";

const LIMITE_TENTATIVAS = 5;
const JANELA_MIN = 15;

export async function entrar(fd: FormData) {
  const email = campo(fd, "email").toLowerCase();
  const senha = campo(fd, "senha");
  if (!email || !senha) voltar("/login", { erro: "Informe e-mail e senha." });

  const desde = new Date(Date.now() - JANELA_MIN * 60_000);
  const falhas = await db.auditoria.count({ where: { acao: "login.falha", entidadeId: email, criadoEm: { gte: desde } } });
  if (falhas >= LIMITE_TENTATIVAS) {
    voltar("/login", { erro: `Muitas tentativas. Aguarde ${JANELA_MIN} minutos e tente de novo.` });
  }

  const u = await db.usuario.findUnique({ where: { email } });
  const confere = u ? await bcrypt.compare(senha, u.senhaHash) : false;
  if (!u || !confere || !u.ativo) {
    await auditar(null, "login.falha", "Usuario", email);
    voltar("/login", { erro: "E-mail ou senha incorretos." });
  }

  await criarSessao(u.id);
  await auditar(u.id, "login.sucesso", "Usuario", u.id);
  redirect("/painel");
}

export async function sair() {
  const u = await usuarioAtual();
  if (u) await auditar(u.id, "logout", "Usuario", u.id);
  await encerrarSessao();
  redirect("/login");
}
