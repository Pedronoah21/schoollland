import { exigir } from "@/lib/sessao";
import { obterEscola } from "@/lib/escola";
import { NOME_PERFIL, pode, type Acao } from "@/lib/permissoes";
import { MenuLateral, BarraInferior, type ItemNav } from "@/components/Navegacao";
import { sair } from "../login/acoes";

export const dynamic = "force-dynamic";

const ITENS: (ItemNav & { acao: Acao })[] = [
  { href: "/painel", rotulo: "Painel", curto: "Painel", icone: "painel", grupo: "Dia a dia", acao: "painel" },
  { href: "/portaria", rotulo: "Portaria", curto: "Portaria", icone: "portaria", grupo: "Dia a dia", acao: "portaria" },
  { href: "/alunos", rotulo: "Alunos", curto: "Alunos", icone: "alunos", grupo: "Dia a dia", acao: "alunos.ver" },
  { href: "/matriculas", rotulo: "Matrículas", curto: "Matrícula", icone: "matriculas", grupo: "Secretaria", acao: "matriculas" },
  { href: "/turmas", rotulo: "Turmas", curto: "Turmas", icone: "turmas", grupo: "Secretaria", acao: "turmas.ver" },
  { href: "/configuracoes", rotulo: "Configurações", curto: "Ajustes", icone: "config", grupo: "Administração", acao: "config.escola" },
  { href: "/configuracoes/auditoria", rotulo: "Auditoria", curto: "Auditoria", icone: "matriculas", grupo: "Administração", acao: "auditoria" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigir();
  const escola = await obterEscola();
  const itens = ITENS.filter((i) => pode(usuario.perfil, i.acao)).map(({ acao: _acao, ...i }) => i);
  return (
    <>
      <div className="app">
        <aside className="side" aria-label="Menu">
          <a className="brand" href="/painel">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span><b>Pátio</b><small>{escola.nome}</small></span>
          </a>
          <MenuLateral itens={itens} />
          <div className="side-foot">
            <span><b style={{ fontWeight: 600 }}>{usuario.nome}</b><br /><span className="muted">{NOME_PERFIL[usuario.perfil]}</span></span>
            <form action={sair}><button className="btn sm" type="submit">Sair</button></form>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      <BarraInferior itens={itens} />
    </>
  );
}
