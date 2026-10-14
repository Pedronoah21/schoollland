// Regras da portaria. Funções puras: recebem os fatos e devolvem a decisão,
// sem acessar banco. Usadas pela API da catraca e pela liberação manual.

export type NivelEnsino = "INFANTIL" | "FUND1" | "FUND2" | "MEDIO";
export type StatusMatricula = "PENDENTE" | "ATIVO" | "INATIVO";

export interface FatosPassagem {
  status: StatusMatricula;
  nivel: NivelEnsino | null;
  /** Início das aulas da turma, em minutos (07:00 → 420) */
  entradaMin: number;
  toleranciaMin: number;
  /** Último registro do dia foi uma entrada */
  dentro: boolean;
  /** O responsável autorizou hoje a saída sem acompanhante */
  saidaAutorizadaHoje: boolean;
  /** Horário atual no fuso da escola, em minutos */
  agoraMin: number;
}

export interface OpcoesPassagem {
  /** Nome da pessoa autorizada que está buscando (conferida pela portaria) */
  acompanhante?: string;
  /** Liberação manual feita por um usuário da portaria */
  manual?: { motivo: string };
}

export type Decisao =
  | { liberar: true; tipo: "ENTRADA"; atraso: boolean; mensagem: string }
  | { liberar: true; tipo: "SAIDA"; acompanhante?: string; mensagem: string }
  | { liberar: false; tipo: "BLOQUEIO"; codigo: "MATRICULA_INATIVA" | "MATRICULA_PENDENTE" | "PRECISA_ACOMPANHANTE"; mensagem: string }
  | { liberar: false; tipo: "ERRO"; codigo: "MOTIVO_OBRIGATORIO"; mensagem: string };

export const MOTIVO_MINIMO = 10;

/** Infantil e fundamental I só saem com pessoa autorizada ou autorização do dia no app */
export function exigeAcompanhante(nivel: NivelEnsino | null): boolean {
  return nivel === "INFANTIL" || nivel === "FUND1";
}

export function decidirPassagem(f: FatosPassagem, op: OpcoesPassagem = {}): Decisao {
  if (op.manual && op.manual.motivo.trim().length < MOTIVO_MINIMO) {
    return { liberar: false, tipo: "ERRO", codigo: "MOTIVO_OBRIGATORIO", mensagem: `Descreva o motivo da liberação manual (mínimo de ${MOTIVO_MINIMO} caracteres).` };
  }
  if (f.status === "INATIVO") {
    return { liberar: false, tipo: "BLOQUEIO", codigo: "MATRICULA_INATIVA", mensagem: "Matrícula inativa. Procure a secretaria." };
  }
  if (f.status === "PENDENTE") {
    return { liberar: false, tipo: "BLOQUEIO", codigo: "MATRICULA_PENDENTE", mensagem: "Matrícula ainda não concluída. Procure a secretaria." };
  }

  if (!f.dentro) {
    const atraso = f.agoraMin > f.entradaMin + f.toleranciaMin;
    return { liberar: true, tipo: "ENTRADA", atraso, mensagem: atraso ? "Entrada liberada com atraso." : "Entrada liberada." };
  }

  const acompanhante = op.acompanhante?.trim() || undefined;
  if (exigeAcompanhante(f.nivel) && !f.saidaAutorizadaHoje && !acompanhante) {
    return { liberar: false, tipo: "BLOQUEIO", codigo: "PRECISA_ACOMPANHANTE", mensagem: "Saída só com pessoa autorizada. Confira na portaria." };
  }
  return { liberar: true, tipo: "SAIDA", acompanhante, mensagem: acompanhante ? `Saída liberada com ${acompanhante}.` : "Saída liberada." };
}

/** Está dentro da escola se o último registro liberado do dia foi uma entrada */
export function estaDentro(registrosDoDia: { tipo: "ENTRADA" | "SAIDA" | "BLOQUEIO"; ocorridaEm: Date }[]): boolean {
  const validos = registrosDoDia.filter((r) => r.tipo !== "BLOQUEIO").sort((a, b) => a.ocorridaEm.getTime() - b.ocorridaEm.getTime());
  return validos.length > 0 && validos[validos.length - 1].tipo === "ENTRADA";
}
