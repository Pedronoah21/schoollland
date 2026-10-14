/** Mensagem de retorno de um formulário, vinda pela URL (?ok=... ou ?erro=...) */
export function Aviso({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <div className="callout bad" role="alert">{erro}</div>;
  if (ok) return <div className="callout good" role="status">{ok}</div>;
  return null;
}
