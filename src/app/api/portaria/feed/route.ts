import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";
import { pode } from "@/lib/permissoes";
import { passagensDoDia, presentesAgora } from "@/lib/portaria-servico";

export const dynamic = "force-dynamic";

/** Registros do dia para a tela da portaria, atualizada a cada poucos segundos */
export async function GET() {
  const u = await usuarioAtual();
  if (!u || !pode(u.perfil, "portaria")) return NextResponse.json({ erro: "Sem acesso" }, { status: 401 });
  const [passagens, presentes] = await Promise.all([passagensDoDia(40), presentesAgora()]);
  return NextResponse.json({ passagens, presentes }, { headers: { "Cache-Control": "no-store" } });
}
