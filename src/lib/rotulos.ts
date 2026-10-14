export const NOME_NIVEL = { INFANTIL: "Educação infantil", FUND1: "Fundamental I", FUND2: "Fundamental II", MEDIO: "Ensino médio" } as const;
export const NOME_TURNO = { MANHA: "Manhã", TARDE: "Tarde", INTEGRAL: "Integral" } as const;
export const NOME_STATUS = { PENDENTE: "Matrícula pendente", ATIVO: "Ativo", INATIVO: "Inativo" } as const;

export const NIVEIS = Object.entries(NOME_NIVEL) as [keyof typeof NOME_NIVEL, string][];
export const TURNOS = Object.entries(NOME_TURNO) as [keyof typeof NOME_TURNO, string][];

export function pillStatus(status: keyof typeof NOME_STATUS) {
  return status === "ATIVO" ? "p-good" : status === "PENDENTE" ? "p-warn" : "p-mute";
}

export function formatarData(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
