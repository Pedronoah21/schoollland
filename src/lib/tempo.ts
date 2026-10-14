// Datas e horários sempre no fuso da escola, nunca no fuso do servidor.

function partes(data: Date, fuso: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(data)) p[type] = value;
  return p;
}

/** "AAAA-MM-DD" no fuso informado */
export function dataLocal(data: Date, fuso: string): string {
  const p = partes(data, fuso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutos desde a meia-noite no fuso informado (07:15 → 435) */
export function minutosLocais(data: Date, fuso: string): number {
  const p = partes(data, fuso);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** "07:15" → 435. Lança erro para formato inválido. */
export function horaParaMinutos(hora: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora.trim());
  if (!m) throw new Error(`Horário inválido: ${hora}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutosParaHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function horaLocal(data: Date, fuso: string): string {
  return minutosParaHora(minutosLocais(data, fuso));
}

/** Idade completa em anos numa data de referência */
export function idade(nascimento: Date, referencia: Date): number {
  let anos = referencia.getUTCFullYear() - nascimento.getUTCFullYear();
  const antesDoAniversario =
    referencia.getUTCMonth() < nascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === nascimento.getUTCMonth() && referencia.getUTCDate() < nascimento.getUTCDate());
  if (antesDoAniversario) anos--;
  return anos;
}
