import { db } from "./db";

/**
 * Coloca um aviso na fila para os responsáveis pedagógicos do aluno.
 * O envio pelo app e pelo WhatsApp entra na Fase 4; até lá os avisos ficam registrados
 * com status PENDENTE e podem ser consultados no banco.
 */
export async function avisarResponsaveis(alunoId: string, titulo: string, mensagem: string) {
  const vinculos = await db.alunoResponsavel.findMany({ where: { alunoId, pedagogico: true }, select: { responsavelId: true } });
  if (!vinculos.length) return 0;
  await db.notificacao.createMany({
    data: vinculos.map((v) => ({ responsavelId: v.responsavelId, titulo, mensagem })),
  });
  return vinculos.length;
}
