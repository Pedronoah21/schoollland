import { NIVEIS, TURNOS } from "@/lib/rotulos";

interface Valores {
  nome?: string;
  nivel?: string;
  turno?: string;
  ano?: number;
  capacidade?: number;
  entrada?: string;
  toleranciaMin?: number;
}

export function CamposTurma({ v = {}, anoPadrao }: { v?: Valores; anoPadrao: number }) {
  return (
    <div className="form tres">
      <div className="field">
        <label htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" defaultValue={v.nome} placeholder="Ex.: 3º ano B" required />
      </div>
      <div className="field">
        <label htmlFor="nivel">Segmento</label>
        <select className="select" id="nivel" name="nivel" defaultValue={v.nivel ?? "FUND1"}>
          {NIVEIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="turno">Turno</label>
        <select className="select" id="turno" name="turno" defaultValue={v.turno ?? "MANHA"}>
          {TURNOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ano">Ano letivo</label>
        <input className="input" id="ano" name="ano" type="number" defaultValue={v.ano ?? anoPadrao} required />
      </div>
      <div className="field">
        <label htmlFor="capacidade">Vagas</label>
        <input className="input" id="capacidade" name="capacidade" type="number" min={1} max={80} defaultValue={v.capacidade ?? 30} required />
      </div>
      <div className="field">
        <label htmlFor="entrada">Início das aulas</label>
        <input className="input" id="entrada" name="entrada" type="time" defaultValue={v.entrada ?? "07:00"} required />
      </div>
      <div className="field">
        <label htmlFor="tolerancia">Tolerância de atraso (min)</label>
        <input className="input" id="tolerancia" name="tolerancia" type="number" min={0} max={60} defaultValue={v.toleranciaMin ?? 15} required />
        <span className="hint">Depois disso, a entrada conta como atraso.</span>
      </div>
    </div>
  );
}
