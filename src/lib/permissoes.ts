// Quem pode fazer o quê. Um único lugar para revisar os acessos.

export type Perfil = "ADMIN" | "DIRECAO" | "SECRETARIA" | "COORDENACAO" | "FINANCEIRO" | "PROFESSOR" | "PORTARIA";

export const NOME_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  DIRECAO: "Direção",
  SECRETARIA: "Secretaria",
  COORDENACAO: "Coordenação pedagógica",
  FINANCEIRO: "Financeiro",
  PROFESSOR: "Professor",
  PORTARIA: "Portaria",
};

const TODOS: Perfil[] = ["ADMIN", "DIRECAO", "SECRETARIA", "COORDENACAO", "FINANCEIRO", "PROFESSOR", "PORTARIA"];

const MAPA = {
  painel: TODOS,
  "alunos.ver": ["ADMIN", "DIRECAO", "SECRETARIA", "COORDENACAO", "PORTARIA"],
  "alunos.editar": ["ADMIN", "DIRECAO", "SECRETARIA"],
  /** Alergias e observações de saúde */
  "alunos.saude": ["ADMIN", "DIRECAO", "SECRETARIA", "COORDENACAO", "PORTARIA"],
  matriculas: ["ADMIN", "DIRECAO", "SECRETARIA"],
  "matriculas.aprovarDesconto": ["ADMIN", "DIRECAO"],
  portaria: ["ADMIN", "DIRECAO", "SECRETARIA", "COORDENACAO", "PORTARIA"],
  "turmas.ver": ["ADMIN", "DIRECAO", "SECRETARIA", "COORDENACAO"],
  "turmas.editar": ["ADMIN", "DIRECAO", "SECRETARIA"],
  "config.escola": ["ADMIN"],
  "config.usuarios": ["ADMIN"],
  "config.catracas": ["ADMIN"],
  auditoria: ["ADMIN", "DIRECAO"],
} satisfies Record<string, Perfil[]>;

export type Acao = keyof typeof MAPA;

export function pode(perfil: Perfil, acao: Acao): boolean {
  return (MAPA[acao] as Perfil[]).includes(perfil);
}
