// Fluxo da matrícula: documentos → (aprovação de desconto) → assinatura → pagamento → concluída.

export type Etapa = "DOCUMENTOS" | "APROVACAO_DESCONTO" | "ASSINATURA" | "PAGAMENTO" | "CONCLUIDA" | "CANCELADA";
export type NivelEnsino = "INFANTIL" | "FUND1" | "FUND2" | "MEDIO";

/** Desconto acima deste percentual precisa de aprovação da direção */
export const LIMITE_DESCONTO_SEM_APROVACAO = 15;

export const ETAPAS_EM_ANDAMENTO: Etapa[] = ["DOCUMENTOS", "APROVACAO_DESCONTO", "ASSINATURA", "PAGAMENTO"];

export const NOME_ETAPA: Record<Etapa, string> = {
  DOCUMENTOS: "Documentos em análise",
  APROVACAO_DESCONTO: "Aprovação de desconto",
  ASSINATURA: "Aguardando assinatura",
  PAGAMENTO: "Aguardando 1º pagamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export interface Documentos {
  docCertidao: boolean;
  docResponsavel: boolean;
  docResidencia: boolean;
  docHistorico: boolean;
  docVacina: boolean;
}

export const DOCUMENTOS: { campo: keyof Documentos; nome: string }[] = [
  { campo: "docCertidao", nome: "Certidão de nascimento do aluno" },
  { campo: "docResponsavel", nome: "RG e CPF do responsável financeiro" },
  { campo: "docResidencia", nome: "Comprovante de residência" },
  { campo: "docHistorico", nome: "Declaração de transferência ou histórico escolar" },
  { campo: "docVacina", nome: "Carteira de vacinação" },
];

/** Na educação infantil não se exige histórico escolar */
export function documentosFaltando(d: Documentos, nivel: NivelEnsino): string[] {
  return DOCUMENTOS.filter((x) => !(x.campo === "docHistorico" && nivel === "INFANTIL"))
    .filter((x) => !d[x.campo])
    .map((x) => x.nome);
}

export interface EstadoMatricula extends Documentos {
  etapa: Etapa;
  descontoPct: number;
  descontoAprovado: boolean;
  nivel: NivelEnsino;
}

export type ResultadoAvanco = { ok: true; proxima: Etapa } | { ok: false; erro: string };

export function avancarEtapa(m: EstadoMatricula): ResultadoAvanco {
  switch (m.etapa) {
    case "DOCUMENTOS": {
      const faltam = documentosFaltando(m, m.nivel);
      if (faltam.length) return { ok: false, erro: `Faltam documentos: ${faltam.join("; ")}.` };
      const precisaAprovar = m.descontoPct > LIMITE_DESCONTO_SEM_APROVACAO && !m.descontoAprovado;
      return { ok: true, proxima: precisaAprovar ? "APROVACAO_DESCONTO" : "ASSINATURA" };
    }
    case "APROVACAO_DESCONTO":
      if (!m.descontoAprovado) return { ok: false, erro: "O desconto ainda não foi aprovado pela direção." };
      return { ok: true, proxima: "ASSINATURA" };
    case "ASSINATURA":
      return { ok: true, proxima: "PAGAMENTO" };
    case "PAGAMENTO":
      return { ok: true, proxima: "CONCLUIDA" };
    default:
      return { ok: false, erro: "Esta matrícula já foi encerrada." };
  }
}

/** Vagas livres considerando alunos ativos e matrículas ainda em andamento */
export function vagasLivres(capacidade: number, ativos: number, emAndamento: number): number {
  return Math.max(0, capacidade - ativos - emAndamento);
}

/** Código de matrícula: ano + sequência com 4 dígitos (2027-0042) */
export function codigoMatricula(ano: number, sequencia: number): string {
  return `${ano}-${String(sequencia).padStart(4, "0")}`;
}
