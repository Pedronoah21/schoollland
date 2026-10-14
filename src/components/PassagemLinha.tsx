import { Avatar } from "./Avatar";

export interface PassagemView {
  id: string;
  hora: string;
  tipo: "ENTRADA" | "SAIDA" | "BLOQUEIO";
  origem: "CATRACA" | "MANUAL";
  atraso: boolean;
  motivo: string | null;
  acompanhante: string | null;
  usuario: string | null;
  aluno: { id: string; nome: string; turma: string | null; alergias: string | null };
}

export function rotuloPassagem(p: Pick<PassagemView, "tipo" | "atraso" | "origem">) {
  if (p.tipo === "BLOQUEIO") return <span className="pill p-bad">Bloqueado</span>;
  if (p.tipo === "SAIDA") return <span className="pill p-info">Saída{p.origem === "MANUAL" ? " manual" : ""}</span>;
  if (p.atraso) return <span className="pill p-warn">Entrada · atraso</span>;
  return <span className="pill p-good">Entrada{p.origem === "MANUAL" ? " manual" : ""}</span>;
}

export function PassagemLinha({ p }: { p: PassagemView }) {
  const detalhe = p.tipo === "BLOQUEIO" ? p.motivo : p.acompanhante ? `com ${p.acompanhante}` : p.origem === "MANUAL" ? `liberado por ${p.usuario ?? "portaria"}` : "catraca";
  return (
    <li>
      <span className="t">{p.hora}</span>
      <Avatar nome={p.aluno.nome} />
      <span style={{ minWidth: 0 }}>
        <b>{p.aluno.nome}</b>
        <span className="sub">{p.aluno.turma ?? "Sem turma"} · {detalhe}</span>
      </span>
      {rotuloPassagem(p)}
    </li>
  );
}
