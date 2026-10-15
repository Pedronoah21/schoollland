# Pátio Escolar

Sistema de gestão escolar feito sob medida, a partir do Sponte como referência de funcionalidades.
Esta é a **Fase 1**: a base da escola funcionando com dados reais.

| Pronto nesta versão | Próximas fases |
| --- | --- |
| Primeiro acesso, login e perfis (administrador, direção, secretaria, coordenação, financeiro, professor, portaria) | Fase 2: diário, chamada, notas, boletim, horários |
| Turmas com vagas, turno e horário de entrada | Fase 3: mensalidades, PIX e boleto, cobrança, notas fiscais |
| Alunos, responsáveis, pessoas autorizadas a buscar, alergias | Fase 4: app das famílias, comunicados, captação, indicadores |
| Matrícula e rematrícula por etapas, com aprovação de desconto pela direção | |
| Portaria ao vivo, liberação manual com motivo, saída acompanhada | |
| API para catraca (online e sem internet) — veja [docs/catraca.md](docs/catraca.md) | |
| Auditoria de tudo que mexe em aluno, matrícula, acesso e equipe | |

O modelo navegável do sistema completo está em [`modelo/index.html`](modelo/index.html): baixe e abra no navegador, ou publique pelo GitHub Pages (Settings → Pages → branch `main`, pasta `/`) e acesse `/modelo/`. Ele serve de referência visual para as próximas fases.

---

## Como colocar no ar (sem precisar programar)

Você vai usar dois serviços com plano gratuito para começar: **Neon** (o banco de dados) e
**Vercel** (onde o sistema roda). Leva uns 20 minutos.

### 1. Banco de dados no Neon

1. Crie uma conta em <https://neon.tech> (pode entrar com a conta do GitHub).
2. Clique em **New Project**. Nome: `patio`. Em **Region**, escolha **AWS São Paulo (sa-east-1)**,
   para os dados dos alunos ficarem no Brasil.
3. Na tela do projeto, clique em **Connect** e copie o endereço que começa com `postgresql://`.
   Guarde: é o `DATABASE_URL`.

### 2. Chave secreta

Gere uma senha longa e aleatória com **pelo menos 40 caracteres**, só letras e números
(qualquer gerador de senhas serve). Guarde: é o `SESSION_SECRET`. Ela protege os logins;
não compartilhe e não troque depois sem motivo (trocar desconecta todo mundo).

### 3. Publicar na Vercel

1. Crie uma conta em <https://vercel.com> entrando com o GitHub.
2. Clique em **Add New → Project** e escolha o repositório deste sistema.
3. Abra **Environment Variables** e cadastre as duas:
   - `DATABASE_URL` = o endereço do Neon
   - `SESSION_SECRET` = a chave do passo 2
4. Clique em **Deploy**. Na primeira vez, o sistema cria as tabelas do banco sozinho.
5. Ao terminar, a Vercel mostra o endereço (algo como `patio-escolar.vercel.app`).
   Depois você pode ligar um domínio próprio, como `sistema.suaescola.com.br`.

### 4. Primeiro acesso

Abra o endereço. A tela de **primeiro acesso** pede o nome da escola, o ano letivo, o fuso horário
e cria a sua conta de administrador. Ela só aparece uma vez. Depois:

1. **Turmas**: confira as turmas criadas e ajuste vagas e horário de entrada.
2. **Configurações → Equipe**: crie o acesso de cada pessoa com o perfil certo.
3. **Matrículas → Nova matrícula**: cadastre os alunos. Ao concluir a matrícula, o aluno recebe o
   código e passa na catraca.
4. **Configurações → Catracas**: cadastre a catraca e entregue o token a quem for instalar.

### Antes de usar com dados reais

- Passe o Neon para um plano pago quando os dados forem reais: ele guarda o histórico do banco
  e permite voltar no tempo em caso de erro.
- Restrinja quem tem perfil de administrador.
- Para trazer os dados do Sponte, peça à escola a exportação em planilha; a importação automática
  pode ser feita como próximo passo.

---

## Para quem for desenvolver

Tecnologias: Next.js 15 (App Router, Server Actions), TypeScript, Prisma, PostgreSQL.

```bash
cp .env.example .env          # preencha DATABASE_URL e SESSION_SECRET
docker compose up -d          # banco local (ou use um banco do Neon)
npm install
npm run db:push               # cria as tabelas
npm run dev                   # http://localhost:3000
npm test                      # regras de portaria, matrícula, CPF e fuso horário
```

Organização:

- `prisma/schema.prisma`: modelo de dados.
- `src/lib/regras/`: regras de negócio puras e testadas (portaria e matrícula).
- `src/lib/permissoes.ts`: quem pode fazer o quê, num lugar só.
- `src/lib/portaria-servico.ts`: registro de passagens usado pela tela e pela API da catraca.
- `src/app/(app)/`: telas logadas. `src/app/api/catraca/`: API das catracas.

Decisões importantes:

- Horários sempre no fuso da escola (`Escola.fuso`), nunca no do servidor.
- Cada passagem, inclusive bloqueio, fica registrada com origem (catraca ou manual) e usuário.
- Saúde e alergias só aparecem para perfis autorizados; a API da catraca recebe só o mínimo.
- Senhas com bcrypt; sessão em cookie assinado (12 horas); 5 tentativas erradas em 15 minutos
  bloqueiam o login daquele e-mail temporariamente.
- Avisos aos responsáveis entram na tabela `Notificacao` com status `PENDENTE`; o envio por app e
  WhatsApp entra na Fase 4.
