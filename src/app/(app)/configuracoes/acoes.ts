"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { obterEscola } from "@/lib/escola";
import { FUSOS } from "@/lib/fusos";
import { NOME_PERFIL } from "@/lib/permissoes";
import { hashToken, novoToken } from "@/lib/dispositivos";
import { campo, marcado, voltar } from "@/lib/retorno";

const PG = "/configuracoes";

export async function salvarEscola(fd: FormData) {
  const u = await exigir("config.escola");
  const nome = campo(fd, "nome");
  const fuso = campo(fd, "fuso");
  if (nome.length < 3) voltar(PG, { erro: "Informe o nome da escola." });
  if (!FUSOS.some(([v]) => v === fuso)) voltar(PG, { erro: "Fuso horário inválido." });
  await db.escola.update({ where: { id: 1 }, data: { nome, fuso } });
  await auditar(u.id, "escola.editada", "Escola", "1", { nome, fuso });
  revalidatePath("/", "layout");
  voltar(PG, { ok: "Dados da escola salvos." });
}

/** Passa para o próximo ano letivo: quem tem rematrícula concluída vai para a nova turma. */
export async function virarAnoLetivo(fd: FormData) {
  const u = await exigir("config.escola");
  if (!marcado(fd, "confirmo")) voltar(PG, { erro: "Marque a confirmação para virar o ano letivo." });
  const escola = await obterEscola();
  const novo = escola.anoLetivo + 1;
  const pendentes = await db.matricula.count({ where: { ano: novo, etapa: { in: ["DOCUMENTOS", "APROVACAO_DESCONTO", "ASSINATURA", "PAGAMENTO"] } } });
  const concluidas = await db.matricula.findMany({ where: { ano: novo, etapa: "CONCLUIDA" }, select: { alunoId: true, turmaId: true } });
  await db.$transaction([
    ...concluidas.map((m) => db.aluno.update({ where: { id: m.alunoId }, data: { turmaId: m.turmaId, status: "ATIVO", motivoInativo: null } })),
    db.escola.update({ where: { id: 1 }, data: { anoLetivo: novo } }),
  ]);
  const semRematricula = await db.aluno.count({ where: { status: "ATIVO", turma: { ano: { lt: novo } } } });
  await auditar(u.id, "escola.ano_virado", "Escola", "1", { de: escola.anoLetivo, para: novo, movidos: concluidas.length, semRematricula, pendentes });
  revalidatePath("/", "layout");
  voltar(PG, {
    ok: `Ano letivo ${novo} iniciado. ${concluidas.length} aluno(s) foram para as novas turmas. ${semRematricula} continuam ativos sem rematrícula e ${pendentes} matrícula(s) ainda estão em andamento.`,
  });
}

export async function criarUsuario(fd: FormData) {
  const u = await exigir("config.usuarios");
  const nome = campo(fd, "nome");
  const email = campo(fd, "email").toLowerCase();
  const perfil = campo(fd, "perfil") as Perfil;
  const senha = campo(fd, "senha");
  if (nome.length < 3) voltar(PG, { erro: "Informe o nome." });
  if (!/^\S+@\S+\.\S+$/.test(email)) voltar(PG, { erro: "Confira o e-mail." });
  if (!(perfil in NOME_PERFIL)) voltar(PG, { erro: "Escolha o perfil." });
  if (senha.length < 10) voltar(PG, { erro: "A senha inicial precisa ter pelo menos 10 caracteres." });
  if (await db.usuario.findUnique({ where: { email } })) voltar(PG, { erro: "Já existe um usuário com este e-mail." });
  const novo = await db.usuario.create({ data: { nome, email, perfil, senhaHash: await bcrypt.hash(senha, 12) } });
  await auditar(u.id, "usuario.criado", "Usuario", novo.id, { email, perfil });
  revalidatePath(PG);
  voltar(PG, { ok: `Acesso criado para ${nome}. Passe a senha inicial pessoalmente.` });
}

export async function alterarUsuario(fd: FormData) {
  const u = await exigir("config.usuarios");
  const id = campo(fd, "id");
  const acao = campo(fd, "acao");
  if (id === u.id && acao !== "senha") voltar(PG, { erro: "Você não pode alterar o próprio perfil ou acesso." });
  const alvo = await db.usuario.findUnique({ where: { id } });
  if (!alvo) voltar(PG, { erro: "Usuário não encontrado." });
  if (acao === "ativar" || acao === "desativar") {
    if (acao === "desativar" && alvo.perfil === "ADMIN") {
      const admins = await db.usuario.count({ where: { perfil: "ADMIN", ativo: true } });
      if (admins <= 1) voltar(PG, { erro: "A escola precisa de pelo menos um administrador ativo." });
    }
    await db.usuario.update({ where: { id }, data: { ativo: acao === "ativar" } });
    await auditar(u.id, `usuario.${acao}`, "Usuario", id);
    revalidatePath(PG);
    voltar(PG, { ok: `${alvo.nome} ${acao === "ativar" ? "reativado" : "desativado"}. ${acao === "desativar" ? "O acesso foi encerrado na hora." : ""}` });
  }
  if (acao === "senha") {
    const senha = campo(fd, "senha");
    if (senha.length < 10) voltar(PG, { erro: "A nova senha precisa ter pelo menos 10 caracteres." });
    await db.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 12) } });
    await auditar(u.id, "usuario.senha_trocada", "Usuario", id);
    voltar(PG, { ok: `Senha de ${alvo.nome} trocada.` });
  }
  voltar(PG, { erro: "Ação desconhecida." });
}

export type EstadoCatraca = { token?: string; nome?: string; erro?: string };

/** Cria a catraca e devolve o token uma única vez (não passa pela URL nem fica salvo em texto) */
export async function criarCatraca(_prev: EstadoCatraca, fd: FormData): Promise<EstadoCatraca> {
  const u = await exigir("config.catracas");
  const nome = campo(fd, "nome");
  if (nome.length < 3) return { erro: "Dê um nome à catraca, como Portão principal." };
  const token = novoToken();
  const d = await db.dispositivo.create({ data: { nome, tokenHash: hashToken(token) } });
  await auditar(u.id, "catraca.criada", "Dispositivo", d.id, { nome });
  revalidatePath(PG);
  return { token, nome };
}

export async function desativarCatraca(fd: FormData) {
  const u = await exigir("config.catracas");
  const id = campo(fd, "id");
  await db.dispositivo.update({ where: { id }, data: { ativo: false } });
  await auditar(u.id, "catraca.desativada", "Dispositivo", id);
  revalidatePath(PG);
  voltar(PG, { ok: "Catraca desativada. O token antigo deixa de funcionar." });
}
