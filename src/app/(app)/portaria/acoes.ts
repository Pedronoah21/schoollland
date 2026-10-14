"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/sessao";
import { campo, voltar } from "@/lib/retorno";
import { registrarPassagem } from "@/lib/portaria-servico";

function volta(q: string) {
  return q ? `/portaria?q=${encodeURIComponent(q)}` : "/portaria";
}

/** Liberação manual: aluno sem cartão, catraca com defeito etc. Exige motivo. */
export async function liberarManual(fd: FormData) {
  const u = await exigir("portaria");
  const q = campo(fd, "q");
  const r = await registrarPassagem({ alunoId: campo(fd, "alunoId"), origem: "MANUAL", usuarioId: u.id, motivo: campo(fd, "motivo") });
  revalidatePath("/portaria");
  if (!r.ok) voltar(volta(q), { erro: r.erro });
  if (!r.decisao.liberar) voltar(volta(q), { erro: `${r.aluno.nome}: ${r.decisao.mensagem}` });
  voltar(volta(q), { ok: `${r.aluno.nome}: ${r.decisao.mensagem}` });
}

/** Saída de aluno pequeno com pessoa autorizada, conferida pela portaria */
export async function saidaAcompanhada(fd: FormData) {
  const u = await exigir("portaria");
  const q = campo(fd, "q");
  const acompanhante = campo(fd, "acompanhante");
  if (!acompanhante) voltar(volta(q), { erro: "Escolha quem está buscando o aluno." });
  const r = await registrarPassagem({
    alunoId: campo(fd, "alunoId"),
    origem: "MANUAL",
    usuarioId: u.id,
    acompanhante,
    motivo: `Saída com ${acompanhante}, documento conferido na portaria`,
  });
  revalidatePath("/portaria");
  if (!r.ok) voltar(volta(q), { erro: r.erro });
  if (!r.decisao.liberar) voltar(volta(q), { erro: `${r.aluno.nome}: ${r.decisao.mensagem}` });
  voltar(volta(q), { ok: `${r.aluno.nome}: ${r.decisao.mensagem}` });
}
