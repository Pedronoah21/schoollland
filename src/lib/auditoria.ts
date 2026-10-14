import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Registra quem fez o quê. Usado em tudo que mexe com dados de aluno, matrícula e acesso. */
export async function auditar(
  usuarioId: string | null,
  acao: string,
  entidade: string,
  entidadeId?: string | null,
  detalhes?: Prisma.InputJsonValue,
) {
  await db.auditoria.create({
    data: { usuarioId, acao, entidade, entidadeId: entidadeId ?? null, detalhes: detalhes ?? undefined },
  });
}
