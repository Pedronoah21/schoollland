import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispositivoDaRequisicao } from "@/lib/dispositivos";
import { registrarPassagem } from "@/lib/portaria-servico";

export const dynamic = "force-dynamic";

/**
 * Chamado pela catraca a cada leitura de cartão, QR code ou código digitado.
 * Corpo: { "cartao": "..." } ou { "codigo": "2027-0042" }; opcional "ocorridaEm" (ISO) para envios atrasados.
 * Resposta: { liberar, tipo, mensagem, aluno } — a catraca libera o giro só se liberar = true.
 */
export async function POST(req: Request) {
  const disp = await dispositivoDaRequisicao(req);
  if (!disp) return NextResponse.json({ erro: "Catraca não autorizada" }, { status: 401 });

  let corpo: { cartao?: unknown; codigo?: unknown; ocorridaEm?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Envie um JSON com cartao ou codigo" }, { status: 400 });
  }
  const cartao = typeof corpo.cartao === "string" ? corpo.cartao.trim() : "";
  const codigo = typeof corpo.codigo === "string" ? corpo.codigo.trim() : "";
  if (!cartao && !codigo) return NextResponse.json({ erro: "Envie cartao ou codigo" }, { status: 400 });

  let quando: Date | undefined;
  if (typeof corpo.ocorridaEm === "string") {
    const d = new Date(corpo.ocorridaEm);
    const idadeMs = Date.now() - d.getTime();
    if (Number.isNaN(d.getTime()) || idadeMs < -60_000 || idadeMs > 24 * 3600_000) {
      return NextResponse.json({ erro: "ocorridaEm deve ser das últimas 24 horas" }, { status: 400 });
    }
    quando = d;
  }

  const aluno = await db.aluno.findFirst({ where: cartao ? { cartao } : { codigo }, select: { id: true } });
  if (!aluno) {
    return NextResponse.json({ liberar: false, tipo: "BLOQUEIO", mensagem: "Cartão não cadastrado. Procure a secretaria." }, { status: 404 });
  }

  const r = await registrarPassagem({ alunoId: aluno.id, origem: "CATRACA", dispositivoId: disp.id, quando });
  if (!r.ok) return NextResponse.json({ liberar: false, tipo: "BLOQUEIO", mensagem: r.erro }, { status: 422 });
  return NextResponse.json({
    liberar: r.decisao.liberar,
    tipo: r.decisao.tipo,
    mensagem: r.decisao.mensagem,
    aluno: { nome: r.aluno.nome, turma: r.aluno.turma, iniciais: r.aluno.fotoIniciais, alergias: r.aluno.alergias },
  });
}
