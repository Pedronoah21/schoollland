function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const fortes = partes.filter((p) => p.length > 2);
  const usar = (fortes.length ? fortes : partes).slice(0, 2);
  return usar.map((p) => p[0]!.toUpperCase()).join("");
}

function matiz(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  return (
    <span className={`av${grande ? " lg" : ""}`} style={{ background: `hsl(${matiz(nome)} 42% 44%)` }} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}
