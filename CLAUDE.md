@AGENTS.md

# Bolão na Mão — Regras do Projeto

## Referência principal
O briefing completo está em `briefing-bolao-na-mao.md`. É a fonte da verdade
para regras de negócio, modelo de dados, design system e escopo.

## Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **UI**: shadcn/ui (Radix) + Lucide React
- **Backend/BaaS**: Supabase (Postgres + Auth + Storage + RLS)
- **Auth**: Supabase Auth (e-mail + senha)
- **Hosting**: Vercel Free
- **Crons**: Supabase `pg_cron`
- **PWA**: @serwist/next

## Regras absolutas
- UI 100% em **PT-BR**
- Timezone: **America/Fortaleza (UTC-3)** em todos os deadlines — usar `lib/datetime.ts`
- Custo de operação: **R$0** (free tier em tudo)
- Máximo **20 usuários** — não projetar para escala
- Sem dark mode — nunca, permanente fora de escopo

## Fora de escopo permanente
Pagamentos · prêmios em dinheiro · dark mode · notificações push ·
live score em tempo real · outros torneios além da Copa 2026 ·
comentários/feed/chat · escala para >20 usuários · head-to-head ·
estatísticas avançadas · detalhe de jogo

## Arquitetura de scoring
- Cálculo canônico: **SQL** (funções `calculate_odd`, `calculate_base_points`)
- Preview na UI: `lib/odds.ts` + `lib/scoring.ts` (mesma `ODDS_TABLE`, só para exibição)
- **Nunca persista pontos calculados no TypeScript** — apenas o SQL escreve na coluna `total_points`
- Odds refletem `tier_at_kickoff` (imutável após kickoff)

## Convenções de código
- Componentes: PascalCase
- Funções/hooks: camelCase
- Funções SQL: snake_case
- Migrations: prefixo `YYYYMMDDHHMMSS_nome.sql`
- Import alias: `@/` aponta para a raiz do projeto

## Tailwind CSS 4 (IMPORTANTE)
- **Sem `tailwind.config.ts`** — tokens definidos via `@theme inline` em `app/globals.css`
- `@theme inline { --color-primary: #FFD700 }` cria utilitário `bg-primary`
- Não usar diretivas Tailwind v3 (`@tailwind base`, `@apply` em layers)

## Supabase
- Client browser: `lib/supabase/client.ts`
- Client server: `lib/supabase/server.ts`
- Middleware de sessão: `lib/supabase/middleware.ts` + `middleware.ts` na raiz
- Types: `lib/supabase/types.ts` — gerado por `npm run db:types`
- RLS obrigatório em todas as tabelas

## Antes de codar qualquer tela
1. Ler o briefing para entender a regra de negócio
2. Verificar se existe função SQL já pronta para o cálculo necessário
3. Usar `lib/datetime.ts` para qualquer manipulação de data/hora
4. Verificar se o componente de UI já existe em `components/ui/`
