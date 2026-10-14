"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PassagemLinha, type PassagemView } from "@/components/PassagemLinha";

type Filtro = "todos" | "entradas" | "saidas" | "ocorrencias";

const FILTROS: [Filtro, string][] = [["todos", "Tudo"], ["entradas", "Entradas"], ["saidas", "Saídas"], ["ocorrencias", "Ocorrências"]];

export function AoVivo({ inicial, presentesInicial }: { inicial: PassagemView[]; presentesInicial: number }) {
  const [passagens, setPassagens] = useState(inicial);
  const [presentes, setPresentes] = useState(presentesInicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/portaria/feed", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { passagens: PassagemView[]; presentes: number };
        if (!ativo) return;
        setPassagens(d.passagens);
        setPresentes(d.presentes);
        setOffline(false);
      } catch {
        if (ativo) setOffline(true);
      }
    };
    const t = setInterval(buscar, 5000);
    return () => { ativo = false; clearInterval(t); };
  }, []);

  const ultima = passagens[0];
  const lista = passagens.filter((p) =>
    filtro === "todos" ? true
    : filtro === "entradas" ? p.tipo === "ENTRADA"
    : filtro === "saidas" ? p.tipo === "SAIDA"
    : p.tipo === "BLOQUEIO" || p.atraso || p.origem === "MANUAL");

  return (
    <div className="grid2">
      <section className="panel">
        <span className="eyebrow">Última passagem{ultima ? ` · ${ultima.hora}` : ""}</span>
        {ultima ? (
          <div className={`last ${ultima.tipo === "BLOQUEIO" ? "bloq" : "ok"}`} style={{ marginTop: 12 }}>
            <Avatar nome={ultima.aluno.nome} grande />
            <div style={{ minWidth: 0 }}>
              <div className="dir">{ultima.tipo === "BLOQUEIO" ? "Bloqueado" : ultima.tipo === "ENTRADA" ? "Entrada liberada" : "Saída liberada"}</div>
              <b style={{ display: "block", marginTop: 4, fontSize: "1.05rem" }}>{ultima.aluno.nome}</b>
              <span className="muted">{ultima.aluno.turma ?? "Sem turma"}{ultima.tipo === "BLOQUEIO" && ultima.motivo ? ` · ${ultima.motivo}` : ""}</span>
              {ultima.aluno.alergias && <div style={{ marginTop: 6 }}><span className="pill p-bad">Alergia: {ultima.aluno.alergias}</span></div>}
            </div>
          </div>
        ) : <p className="empty">Nenhuma passagem hoje.</p>}
        {offline && <div className="callout warn" style={{ marginTop: 12 }}>Sem conexão com o sistema. Tentando de novo…</div>}
      </section>
      <section className="panel">
        <div className="panel-head">
          <span><span className="num" style={{ fontFamily: "var(--f-display)", fontSize: "2rem", fontWeight: 700 }}>{presentes}</span> <span className="muted">alunos na escola agora</span></span>
        </div>
        <div className="chips" role="group" aria-label="Filtrar registros" style={{ marginBottom: 10 }}>
          {FILTROS.map(([k, l]) => (
            <button key={k} type="button" className="chip" aria-current={filtro === k ? "true" : undefined} onClick={() => setFiltro(k)} style={{ cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        {lista.length ? <ul className="feed">{lista.map((p) => <PassagemLinha key={p.id} p={p} />)}</ul> : <p className="empty">Nenhum registro neste filtro.</p>}
      </section>
    </div>
  );
}
