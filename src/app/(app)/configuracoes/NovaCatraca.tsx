"use client";

import { useActionState, useState } from "react";
import { criarCatraca, type EstadoCatraca } from "./acoes";

export function NovaCatraca() {
  const [estado, acao, enviando] = useActionState<EstadoCatraca, FormData>(criarCatraca, {});
  const [copiado, setCopiado] = useState(false);

  if (estado.token) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <div className="callout good">Catraca “{estado.nome}” criada. Copie o token agora: ele não aparece de novo.</div>
        <code className="mono" style={{ wordBreak: "break-all", background: "var(--sunk)", padding: 12, borderRadius: 10, display: "block" }}>{estado.token}</code>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(estado.token!).then(() => setCopiado(true), () => setCopiado(false));
            }}
          >
            {copiado ? "Copiado" : "Copiar token"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={acao} className="filters">
      <input className="input" name="nome" placeholder="Nome, ex.: Portão principal" aria-label="Nome da catraca" required minLength={3} />
      <button className="btn primary" type="submit" disabled={enviando}>{enviando ? "Criando…" : "Cadastrar catraca"}</button>
      {estado.erro && <span className="small" style={{ color: "var(--bad)" }}>{estado.erro}</span>}
    </form>
  );
}
