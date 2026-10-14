import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="auth">
      <div className="panel">
        <h1 style={{ fontSize: "1.5rem" }}>Página não encontrada</h1>
        <p className="muted" style={{ margin: 0 }}>O endereço pode ter mudado ou o registro foi removido.</p>
        <Link className="btn primary" href="/painel">Voltar ao painel</Link>
      </div>
    </main>
  );
}
