"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";

export interface ItemNav {
  href: string;
  rotulo: string;
  curto: string;
  icone: string;
  grupo: string;
}

const ativo = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export function MenuLateral({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  const grupos = [...new Set(itens.map((i) => i.grupo))];
  return (
    <nav className="nav" aria-label="Menu principal">
      {grupos.map((g) => (
        <div key={g} style={{ display: "contents" }}>
          <span className="nav-g">{g}</span>
          {itens
            .filter((i) => i.grupo === g)
            .map((i) => (
              <Link key={i.href} href={i.href} aria-current={ativo(pathname, i.href) ? "page" : undefined}>
                <Icone nome={i.icone} />
                {i.rotulo}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}

export function BarraInferior({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Menu principal">
      {itens.slice(0, 5).map((i) => (
        <Link key={i.href} href={i.href} aria-current={ativo(pathname, i.href) ? "page" : undefined}>
          <Icone nome={i.icone} />
          {i.curto}
        </Link>
      ))}
    </nav>
  );
}
