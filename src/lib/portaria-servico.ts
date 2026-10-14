import { db } from "./db";
import { obterEscola } from "./escola";
import { dataLocal, horaLocal, horaParaMinutos, minutosLocais } from "./tempo";
import { decidirPassagem, estaDentro, type Decisao } from "./regras/portaria";
import { avisarResponsaveis } from "./notificacoes";
import { auditar } from "./auditoria";

export interface PedidoPassagem {
  alunoId: string;
  origem: "CATRACA" | "MANUAL";
  usuarioId?: string;
  dispositivoId?: string;
  acompanhante?: string;
  /** Obrigatório na liberação manual */
  motivo?: string;
  /** Horário real da passagem, para registros feitos sem internet e enviados depois */
  quando?: Date;
}

export type ResultadoPassagem =
  | { ok: true; decisao: Exclude<Decisao, { tipo: "ERRO" }>; aluno: { id: string; nome: string; turma: string | null; alergias: string | null; fotoIniciais: string } }
  | { ok: false; erro: string };

const iniciais = (nome: string) =>
  nome.split(/\s+/).filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || nome.slice(0, 2).toUpperCase();

/** Aplica as regras, grava o registro (inclusive bloqueios) e avisa os responsáveis. */
export async function registrarPassagem(p: PedidoPassagem): Promise<ResultadoPassagem> {
  const escola = await obterEscola();
  const agora = p.quando ?? new Date();
  const hoje = dataLocal(agora, escola.fuso);

  const aluno = await db.aluno.findUnique({
    where: { id: p.alunoId },
    include: { turma: true, passagens: { where: { dataLocal: hoje, ocorridaEm: { lt: agora } }, select: { tipo: true, ocorridaEm: true } } },
  });
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const decisao = decidirPassagem(
    {
      status: aluno.status,
      nivel: aluno.turma?.nivel ?? null,
      entradaMin: horaParaMinutos(aluno.turma?.entrada ?? "07:00"),
      toleranciaMin: aluno.turma?.toleranciaMin ?? 15,
      dentro: estaDentro(aluno.passagens),
      saidaAutorizadaHoje: aluno.saidaAutorizadaEm === hoje,
      agoraMin: minutosLocais(agora, escola.fuso),
    },
    { acompanhante: p.acompanhante, manual: p.origem === "MANUAL" ? { motivo: p.motivo ?? "" } : undefined },
  );
  if (decisao.tipo === "ERRO") return { ok: false, erro: decisao.mensagem };

  const passagem = await db.passagem.create({
    data: {
      alunoId: aluno.id,
      tipo: decisao.tipo,
      origem: p.origem,
      atraso: decisao.tipo === "ENTRADA" && decisao.atraso,
      motivo: decisao.tipo === "BLOQUEIO" ? decisao.mensagem : p.motivo?.trim() || null,
      acompanhante: decisao.tipo === "SAIDA" ? decisao.acompanhante ?? null : null,
      ocorridaEm: agora,
      dataLocal: hoje,
      usuarioId: p.usuarioId ?? null,
      dispositivoId: p.dispositivoId ?? null,
    },
  });

  if (p.origem === "MANUAL") {
    await auditar(p.usuarioId ?? null, `portaria.${decisao.tipo.toLowerCase()}_manual`, "Passagem", passagem.id, {
      aluno: aluno.nome,
      motivo: p.motivo ?? null,
      acompanhante: p.acompanhante ?? null,
    });
  }

  if (decisao.liberar) {
    const hora = horaLocal(agora, escola.fuso);
    const primeiro = aluno.nome.split(" ")[0];
    const texto =
      decisao.tipo === "ENTRADA"
        ? `${primeiro} entrou na escola às ${hora}${decisao.atraso ? ", depois do horário" : ""}.`
        : `${primeiro} saiu da escola às ${hora}${decisao.acompanhante ? ` com ${decisao.acompanhante}` : ""}.`;
    await avisarResponsaveis(aluno.id, decisao.tipo === "ENTRADA" ? "Entrada na escola" : "Saída da escola", texto);
  }

  return {
    ok: true,
    decisao,
    aluno: { id: aluno.id, nome: aluno.nome, turma: aluno.turma?.nome ?? null, alergias: aluno.alergias, fotoIniciais: iniciais(aluno.nome) },
  };
}

/** Registros do dia, mais recentes primeiro */
export async function passagensDoDia(limite = 40) {
  const escola = await obterEscola();
  const hoje = dataLocal(new Date(), escola.fuso);
  const lista = await db.passagem.findMany({
    where: { dataLocal: hoje },
    orderBy: { ocorridaEm: "desc" },
    take: limite,
    include: { aluno: { select: { id: true, nome: true, alergias: true, turma: { select: { nome: true } } } }, usuario: { select: { nome: true } } },
  });
  return lista.map((p) => ({
    id: p.id,
    hora: horaLocal(p.ocorridaEm, escola.fuso),
    tipo: p.tipo,
    origem: p.origem,
    atraso: p.atraso,
    motivo: p.motivo,
    acompanhante: p.acompanhante,
    usuario: p.usuario?.nome ?? null,
    aluno: { id: p.aluno.id, nome: p.aluno.nome, turma: p.aluno.turma?.nome ?? null, alergias: p.aluno.alergias },
  }));
}

/** Quantos alunos estão dentro agora (último registro liberado do dia é entrada) */
export async function presentesAgora(): Promise<number> {
  const escola = await obterEscola();
  const hoje = dataLocal(new Date(), escola.fuso);
  const regs = await db.passagem.findMany({
    where: { dataLocal: hoje, tipo: { in: ["ENTRADA", "SAIDA"] } },
    select: { alunoId: true, tipo: true, ocorridaEm: true },
    orderBy: { ocorridaEm: "asc" },
  });
  const ultimo = new Map<string, string>();
  for (const r of regs) ultimo.set(r.alunoId, r.tipo);
  let n = 0;
  for (const t of ultimo.values()) if (t === "ENTRADA") n++;
  return n;
}
