import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispositivoDaRequisicao } from "@/lib/dispositivos";

export const dynamic = "force-dynamic";

/**
 * Lista mínima para a catraca funcionar sem internet: quem pode entrar e se precisa de
 * acompanhante na saída. Sem dados de saúde, documentos ou contatos (LGPD).
 */
export async function GET(req: Request) {
  const disp = await dispositivoDaRequisicao(req);
  if (!disp) return NextResponse.json({ erro: "Catraca não autorizada" }, { status: 401 });
  const alunos = await db.aluno.findMany({
    where: { status: "ATIVO", OR: [{ cartao: { not: null } }, { codigo: { not: null } }] },
    select: { cartao: true, codigo: true, nome: true, turma: { select: { nivel: true, entrada: true, toleranciaMin: true } } },
  });
  return NextResponse.json({
    geradoEm: new Date().toISOString(),
    alunos: alunos.map((a) => ({
      cartao: a.cartao,
      codigo: a.codigo,
      primeiroNome: a.nome.split(" ")[0],
      saidaSoAcompanhado: a.turma?.nivel === "INFANTIL" || a.turma?.nivel === "FUND1",
      entrada: a.turma?.entrada ?? "07:00",
      toleranciaMin: a.turma?.toleranciaMin ?? 15,
    })),
  });
}
