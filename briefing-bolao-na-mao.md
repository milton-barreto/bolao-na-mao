# Briefing Final — Bolão na Mão

**Guia de desenvolvimento:** tecnologia, regras de negócio, UX e design system

**Versão:** 1.0  
**Última atualização:** 27/05/2026  
**Owner:** você

---

## 1. Sumário Executivo

Bolão na Mão é um WebApp privado (PWA) de bolão para a Copa do Mundo 2026, jogado entre até 20 amigos. O diferencial é que cada palpite é multiplicado por uma odd baseada na disparidade de "tiers" entre as seleções — apostar no zebrão paga mais, apostar no favorito paga menos.

Tudo gratuito: hospedagem (Vercel), banco (Supabase), dados de jogos (football-data.org), todos no free tier.

### Objetivos do MVP

1. Lançar até 31/05/2026 (4 dias).
2. Ficar 100% pronto para fase de grupos antes do 11/06/2026 (início da Copa).
3. Custo de operação: R$ 0.

### Fora de escopo permanente

Pagamentos, prêmios em dinheiro, escala para >20 usuários, outros torneios além da Copa 2026, notificações push, dark mode, detalhe de jogo, comentários/feed, estatísticas avançadas, head-to-head, live score em tempo real.

---

## 2. Personas e Permissões

### 2.1 Jogador (amigo convidado)

- Acessa via e-mail pré-cadastrado pelo admin na lista de allowlist.
- Cadastra senha + foto de perfil + nome.
- Palpita em todos os jogos da fase de grupos, e quando os confrontos do mata-mata estiverem disponíveis após o final da fase de grupos, é habilitado ao jogador palpitar no mata-mata também (incluindo o bilhete premiado).
- Vê ranking e próprios palpites atual. Vê palpites dos outros apenas após o deadline de cada jogo individualmente.
- Edita foto/nome/senha do próprio perfil.

### 2.2 Admin (você)

Tudo o que o jogador faz, mais:

- **Gerenciar allowlist:** adicionar/remover e-mails autorizados.
- **Corrigir placares manualmente:** caso a API falhe ou erre — gatilho de recálculo automático de todos os palpites afetados. Garantindo que após editado manualmente, a API não atualize o que eu já alterei.
- **Marcar API como "fora do ar":** força o sistema a parar de tentar sync e a usar o modo manual.
- **Ajustar tier de seleção manualmente:** override do sistema dinâmico, com registro em `tier_history`.
- **Forçar status de um jogo:** agendado, ao vivo, finalizado, adiado, cancelado.
- **Ver palpites de qualquer usuário em qualquer fase** (para mediar zoeira/discussões).
- **Recalcular ranking manualmente:** caso algo dê errado no cron.

---

## 3. Stack Técnica

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Confirmado por você. Renderização híbrida, deploy fácil no Vercel. |
| UI components | shadcn/ui | Componentes copy-paste sem peso, customizáveis. |
| Backend / BaaS | Supabase (Postgres + Auth + Storage + RLS) | Free tier robusto: 500MB DB, 1GB Storage, 50k MAU. |
| Cliente DB | Supabase JS Client (não Drizzle) | Confirmado — mais simples para projeto pequeno. |
| Hosting | Vercel Free | Confirmado. |
| Crons | Supabase `pg_cron` | Confirmado — Vercel Cron free é limitado. |
| API de dados | football-data.org Free Tier | 10 req/min, suficiente para sync a cada 10 min em dia de jogo. |
| Storage | Supabase Storage (avatar) | 1GB no free, suficiente para 20 fotos de até 2MB. |
| Auth | Supabase Auth (e-mail + senha + reset por e-mail) | Pronto out-of-the-box, gratuito. |
| PWA | next-pwa | "Funciona como app no celular" sem custo. |

---

## 4. Modelo de Dados (Supabase)

```sql
-- ===== AUTH =====
-- Tabela auth.users gerenciada pelo Supabase automaticamente.

-- Perfil público (1:1 com auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- ===== ACESSO =====
create table allowed_emails (
  email text primary key,
  invited_by uuid references profiles(id),
  used boolean default false,
  created_at timestamptz default now()
);

-- ===== TORNEIO =====
create table teams (
  id text primary key, -- 'BRA','ARG','FRA'...
  name text not null, -- 'Brasil'
  flag_url text,
  initial_tier int not null check (initial_tier between 1 and 5),
  current_tier int not null check (current_tier between 1 and 5),
  eliminated boolean default false
);

create table tier_history (
  id uuid primary key default gen_random_uuid(),
  team_id text references teams(id),
  from_tier int,
  to_tier int,
  reason text, -- 'initial','group_rebalance','r16_rebalance','admin_manual'
  changed_by uuid references profiles(id),
  changed_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique, -- ID na football-data.org
  home_team_id text references teams(id),
  away_team_id text references teams(id),
  phase text not null check (phase in ('group','r32','r16','qf','sf','final')),
  group_name text, -- 'A'..'L' para fase de grupos
  round_number int, -- 1, 2 ou 3 (rodada da fase de grupos)
  kickoff_at timestamptz not null,
  deadline_at timestamptz generated always as (kickoff_at - interval '1 hour') stored,

  -- Placar nos 90 minutos (definitivo para pontuação)
  home_score int,
  away_score int,

  -- Mata-mata: quem avançou (definitivo para 1pt do mata-mata)
  advancing_team_id text references teams(id),

  status text default 'scheduled' check (status in ('scheduled','live','finished','postponed','cancelled')),

  -- CRÍTICO: tier registrado no momento do kickoff, para cálculo histórico de odd
  home_tier_at_kickoff int,
  away_tier_at_kickoff int,

  -- Override admin
  manually_edited boolean default false,
  last_synced_at timestamptz
);

-- ===== PALPITES =====
create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  predicted_advancing_team_id text references teams(id), -- só mata-mata

  -- Cache de pontuação (preenchido por trigger após match.status='finished')
  base_points numeric(3,1), -- 0, 1 ou 2
  odd_multiplier numeric(4,2),
  total_points numeric(6,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

-- ===== ADMIN =====
create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz default now()
);

create table app_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- Chaves esperadas:
-- 'api_status' → {"available": true, "last_sync": "..."}
-- 'global_banner' → {"text": "API fora do ar", "type": "warning"}
-- 'tournament_state' → {"current_phase": "group", "current_round": 1}
```

### 4.1 Row Level Security (RLS)

- `profiles`: select para autenticados; update só owner; insert só admin via trigger.
- `allowed_emails`: select e write apenas admin.
- `teams`, `matches`: select público (autenticado); write só admin.
- `bets`:
  - select próprio: sempre.
  - select alheio: apenas se `match.deadline_at < now()`.
  - insert/update: só owner, e só se `match.deadline_at > now()`.
  - admin pode tudo.
- `admin_logs`, `app_config`: só admin.

### 4.2 Tabela de Odds (constante hardcoded no app)

```ts
// /lib/odds.ts
export const ODDS_TABLE = {
  '1v1': { better: 1.50, draw: 1.40, worse: 1.50 },
  '1v2': { better: 1.20, draw: 1.70, worse: 1.80 },
  '1v3': { better: 1.10, draw: 2.10, worse: 2.30 },
  '1v4': { better: 1.05, draw: 2.50, worse: 2.80 },
  '1v5': { better: 1.00, draw: 3.00, worse: 3.50 },
  '2v2': { better: 1.50, draw: 1.40, worse: 1.50 },
  '2v3': { better: 1.20, draw: 1.70, worse: 1.80 },
  '2v4': { better: 1.10, draw: 2.10, worse: 2.30 },
  '2v5': { better: 1.05, draw: 2.50, worse: 2.80 },
  '3v3': { better: 1.50, draw: 1.40, worse: 1.50 },
  '3v4': { better: 1.20, draw: 1.70, worse: 1.80 },
  '3v5': { better: 1.10, draw: 2.10, worse: 2.30 },
  '4v4': { better: 1.50, draw: 1.40, worse: 1.50 },
  '4v5': { better: 1.20, draw: 1.70, worse: 1.80 },
  '5v5': { better: 1.50, draw: 1.40, worse: 1.50 },
}
```

---

## 5. Regras de Negócio

### 5.1 Pontuação Base (FASE DE GRUPOS) — esclarecimento crítico

Os pontos **NÃO somam**. O sistema avalia o cenário e dá o melhor aplicável:

| Cenário | Pontos base |
|---|---:|
| Usuário acertou placar exato nos 90 min | 2 |
| Usuário errou placar mas acertou resultado (vitória de A, vitória de B, ou empate) | 1 |
| Usuário errou placar e resultado | 0 |

### 5.2 Cálculo Final

```text
pontos_finais_no_jogo = pontos_base × odd_do_confronto
```

A odd do confronto vem da tabela acima e considera os tiers no momento do kickoff (não o tier atual), garantindo que rebalanceamentos não afetem pontos passados.

**Exemplo (Marrocos T3 vence Brasil T2):**

- Tabela: linha `2v3`, vitória do pior tier (T3) → odd 1.80.
- Usuário palpitou Marrocos vencer com placar exato → 2 pts base × 1.80 = **3.6 pts**.
- Usuário palpitou só Marrocos vencer (placar errado) → 1 pt base × 1.80 = **1.8 pts**.
- Usuário palpitou empate → erro de resultado, 0 pts.
- Usuário palpitou Brasil vencer → 0 pts.

### 5.3 Tiers Iniciais (48 seleções)

| Tier | Seleções |
|---|---|
| 1 (favoritas) | Portugal, França, Espanha, Inglaterra |
| 2 (fortes) | Brasil, Argentina, Alemanha |
| 3 (não vão ser fáceis) | Japão, Colômbia, Senegal, Uruguai, Marrocos, Bélgica, Holanda, Equador, Noruega, Croácia |
| 4 (sentido de campanha) | Suíça, México, EUA, Canadá, Escócia, Coreia do Sul, Paraguai, Turquia, Suécia, Tunísia, Egito, Irã, Arábia Saudita, Austrália, Áustria, Costa do Marfim, Gana, Tchéquia |
| 5 (vieram para apanhar) | Haiti, Curaçao, Rep. Dem. do Congo, Nova Zelândia, Iraque, Jordânia, Catar, África do Sul, Uzbequistão, Cabo Verde, Panamá, Bósnia e Herzegovina, Argélia |

Total: 4+3+10+18+13 = **48 seleções**.

### 5.4 Regras da Fase de Grupos

1. O jogador palpita em cada jogo individualmente. A rodada é só uma agrupação visual.
2. Deadline por jogo: **1 hora antes do kickoff**. Após o deadline o palpite trava.
3. Se o jogador não palpitou até o deadline, aquele jogo é zerado (0 pts). Sem palpite default.
4. Após digitar placar, a tela mostra os dois cenários: "Se acertar placar: X pts" e "Se só acertar o resultado: Y pts" — ambos já multiplicados pela odd vigente.
5. Após o deadline, o palpite fica visível para os outros usuários do bolão.
6. Após o jogo finalizar, o palpite muda de status para `acertado_placar`, `acertado_resultado` ou `errado`.

### 5.5 Regras da Fase de Mata-Mata

1. O jogador palpita placar nos 90 min + qual time avança (dois campos separados na UI).
2. Pontuação:
   - Acertou placar exato dos 90 min → 2 pts base.
   - Errou placar mas acertou quem avança na chave (independente se foi nos 90, prorrogação ou pênaltis) → 1 pt base.
   - Errou ambos → 0 pts.
3. Multiplicação pela odd igual à fase de grupos.
4. Deadline também 1 hora antes do kickoff de cada jogo.
5. Cada rodada é liberada para palpite somente após o término da rodada anterior (16-avos → oitavas → quartas → semis → final).

### 5.6 Rebalanceamento de Tier

**Quando ocorre:**

- Momento 1: após o último jogo da fase de grupos.
- Momento 2: após o último jogo das oitavas de final (avaliando 16-avos + oitavas, ou seja, todos os jogos do mata-mata até ali).

**Cálculo (por seleção):**

Para cada jogo da janela, a seleção ganha "pontos de tier" conforme a matriz:

| Resultado \ Adversário | Tier melhor (nº menor) | Mesmo tier | Tier pior (nº maior) |
|---|---:|---:|---:|
| Vitória | +3 | +1 | 0 |
| Empate | +1 | 0 | -1 |
| Derrota | 0 | -1 | -3 |

Multiplicador ×1.5 se a diferença de tier ≥ 2 (ex: T4 vence T1 → +3 × 1.5 = +4.5).

**Regra de movimentação:**

- Soma os pontos de tier de todos os jogos da janela.
- Calcula a média (pontos / nº jogos).
- Média ≥ +1 → sobe 1 tier (limitado a 1 nível por janela).
- Média ≤ -1 → desce 1 tier (limitado a 1 nível por janela).
- Caso contrário → fica.

**Restrições:**

- Tier 1 não sobe; Tier 5 não desce.
- Movimentação é independente entre seleções (não há simetria forçada).
- Seleções eliminadas no rebalanceamento da fase de grupos param de receber rebalanceamentos posteriores (estão fora).

**Mata-mata — janela do 2º rebalanceamento:**

- Inclui o jogo de 16-avos + o jogo de oitavas que a seleção jogou.
- Times eliminados nos 16-avos: janela = 1 jogo (média = score do único jogo).

### 5.7 Bilhete Premiado

Tela separada de palpites de placar. Após o sorteio dos 16-avos (fim da fase de grupos), o usuário:

1. Vê o chaveamento dos 32 times nos 16-avos (inspiração visual: simulador da ge.globo.com).
2. Seleciona quem avança em cada confronto, propagando para a próxima fase, até definir o campeão.
3. Pode editar livremente até o dia anterior ao início do mata-mata. Depois trava.

**Pontuação (somada ao ranking geral):**

| Acerto | Pontos |
|---|---:|
| Cada confronto de 16-avos previsto corretamente (= o time previsto avançou) | 1 pt × 16 = até 16 pts |
| Cada confronto de oitavas previsto corretamente | 2 pts × 8 = até 16 pts |
| Cada confronto de quartas previsto corretamente | 5 pts × 4 = até 20 pts (na verdade são as semis — vide briefing original; CONFIRMAR) |
| Cada confronto de semis previsto corretamente | 5 pts × 2 = até 10 pts |
| Confronto da final previsto corretamente | 5 pts |
| Campeão da Copa previsto corretamente | 10 pts |

> ⚠ **Premissa a confirmar:** o briefing original diz "quartas: 2pts por confronto" e "semis: 5pts por jogo" — vou usar literalmente esses valores. Os números acima refletem o briefing fielmente. Total máximo possível ≈ 16 + 16 + 8 + 10 + 5 + 10 = **65 pts** no Bilhete.

Pontuação parcial é possível: se o usuário previu Brasil campeão e o Brasil cai nas oitavas, ele perde os pontos das fases seguintes que poderiam conter o Brasil mas mantém o que acertou até ali + os outros confrontos seguintes que ele pode acertar.

### 5.8 Deadline e edição

- Por jogo, deadline = `kickoff_at - 1h`.
- Antes do deadline: pode editar quantas vezes quiser (`updated_at` registra a última edição).
- Após o deadline: trava; tentar editar = erro 403.

### 5.9 Ranking

- **Pontuação atual:** soma de `total_points` de todos os palpites já finalizados.
- **Pontuação prevista:** somatório de `total_points` reais + soma de pontos máximos potenciais dos palpites pendentes (calculado como `2 × odd` se ainda há palpite, ou 0 se não palpitou e o deadline já passou). V1.1 — não entra no MVP.
- **Pódio:** top 3 com destaque visual (1º maior, 2º e 3º menores em cards laterais).
- **Empate final do bolão:** todos os empatados são considerados campeões juntos (sem critério de desempate).

### 5.10 Casos de Borda

| Cenário | Comportamento |
|---|---|
| Jogo adiado | Status muda para `postponed`, nova `kickoff_at` setada, deadline recalcula automaticamente; palpites permanecem. |
| Jogo cancelado (desistência, etc) | Status `cancelled`, todos os palpites desse jogo são marcados com `total_points = 0` e ignorados no ranking. |
| Admin edita placar de jogo já finalizado | Trigger recalcula `base_points` e `total_points` de todos os palpites afetados; entrada em `admin_logs`. |
| API retorna placar diferente do já cadastrado | Sistema NÃO sobrescreve automaticamente se `manually_edited = true`. Admin é alertado em banner. |
| Usuário deletado (sai do bolão) | Cascade: palpites apagados, perfil apagado. Ranking recalcula. |
| 2 usuários empatam no top 1 | Dividem o título. Visual: foto dos dois lado a lado no pódio. |
| Foto de perfil ofensiva | Admin remove via tela admin → avatar reverte para placeholder padrão. |

---

## 6. UX — Telas e Fluxos

### 6.1 Inventário de Telas (MVP)

| # | Tela | Rota | Observações |
|---:|---|---|---|
| 1 | Login | `/login` | E-mail + senha + "esqueci a senha" |
| 2 | Cadastro | `/cadastro` | Valida contra `allowed_emails` antes de criar conta |
| 3 | Esqueci senha | `/recuperar-senha` | Supabase Auth padrão |
| 4 | Home / Próximos Jogos | `/` | Lista compacta de próximos jogos com call-to-action de palpitar |
| 5 | Rodada de Grupos | `/grupos/rodada/[n]` | Todos os jogos da rodada n; salva palpites individualmente |
| 6 | Minhas Apostas | `/minhas-apostas` | Histórico filtrável por fase/rodada com opção de palpitar quando aplicável, abas por rodada de fase de grupos, aba de mata-mata quando disponível e aba de bilhete premiado quando disponível |
| 7 | Ranking | `/ranking` | Pódio + lista |
| 8 | Perfil | `/perfil` | Edita foto, nome, senha |
| 9 | Admin | `/admin` (gated) | Abas: E-mails / Jogos / Tiers / API / Logs |

### 6.2 Wireframe textual — Tela de Rodada (a mais crítica)

```text
┌─────────────────────────────────────────┐
│ ← Voltar     RODADA 1 - GRUPO A       ⚽ │
├─────────────────────────────────────────┤
│ Deadline do próximo jogo: 30 min ⏱️     │
│ [banner amarelo só se < 1h]             │
├─────────────────────────────────────────┤
│                                         │
│ 🇧🇷 Brasil ⚔️ Marrocos 🇲🇦             │
│ T2                        T3            │
│                                         │
│ Placar:     [ 2 ] x [ 1 ]               │
│                                         │
│ 💰 Se acertar placar:      3.6 pts      │
│ ⚡ Se acertar resultado:   1.8 pts      │
│                                         │
│ Kickoff: 15/06 16h         [ Salvar ]   │
│                                         │
├─────────────────────────────────────────┤
│ 🇫🇷 França ⚔️ Haiti 🇭🇹                 │
│ T1                        T5            │
│ ...                                     │
└─────────────────────────────────────────┘
```

Quando o deadline passa, o card vira read-only com badge "TRAVADO" e o palpite dos outros aparece embaixo (collapsable, "Ver palpites do bolão").

### 6.3 Wireframe textual — Ranking

```text
┌─────────────────────────────────────────┐
│ RANKING — Bolão da Galera          🏆   │
├─────────────────────────────────────────┤
│                                         │
│         ┌──────┐                        │
│ ┌───┐   │ 🥇   │   ┌───┐                │
│ │🥈 │   │ João │   │🥉 │                │
│ │Ana│   │ 42pt │   │Léo│                │
│ │38 │   └──────┘   │35 │                │
│ └───┘              └───┘                │
│                                         │
│ ─────────────────────────────────────   │
│ 4. Pedro           32.5 pts             │
│ 5. Marina          28.0 pts             │
│ 6. Você (Rafa)     26.3 pts ← destaque  │
│ 7. Bruno           24.1 pts             │
│ ...                                     │
│                                         │
│ 💬 "Cês tão grudados, hein!"           │
└─────────────────────────────────────────┘
```

### 6.4 Fluxos críticos

**Fluxo 1 — Primeiro acesso:**

1. Recebe convite via WhatsApp (compartilhamento manual do link).
2. Abre o link → vai pra `/cadastro`.
3. Insere e-mail → sistema checa allowlist. Se não está → mensagem "Tu não tá na lista, mano. Pede pro admin te adicionar."
4. Se está → preenche nome, senha, foto → conta criada.
5. Redireciona para Home.

**Fluxo 2 — Palpitar:**

6. Home → vê próximos jogos.
7. Clica em "Palpitar rodada" → vai pra `/grupos/rodada/1`.
8. Preenche placar de cada jogo → vê pontuação potencial em tempo real.
9. Clica "Salvar" em cada card individualmente (não há "salvar tudo" — cada palpite é commit independente).
10. Toast: "Salvou, seu merda. Boa sorte." 🍀

**Fluxo 3 — Admin corrige placar:**

11. Admin vai pra `/admin/jogos`.
12. Acha o jogo, clica "Editar".
13. Insere placar correto, marca `status = finished`, justifica em campo texto.
14. Trigger SQL recalcula todos os palpites do jogo.
15. Entrada em `admin_logs`.
16. Ranking atualiza no próximo cron (ou pode chamar refresh manual).

### 6.5 Tom de voz — microcopy (estilo CazéTV / Gen Z)

| Situação | Copy |
|---|---|
| Onboarding vazio | "Tu nem palpitou ainda, hein? Bora pra cima." |
| Senha incorreta | "Senha errada, mano. Tenta de novo." |
| E-mail não autorizado | "Tu não tá na lista, brother. Pede o admin pra liberar." |
| Salvou palpite | "Salvou! Agora reza." 🙏 |
| Deadline < 1h | "Ó o relógio! Falta menos de 1h pro jogo." |
| Acertou placar | "MITOU! Acertou na mosca." 🎯 |
| Acertou só resultado | "Foi por pouco, mas tá valendo!" |
| Errou tudo | "Vish, deu ruim. Bora pro próximo." |
| Top 1 do ranking | "MITO 🏆" |
| Top 3 | "Pódio na régua." |
| Último lugar | "Lanterninha, mas ainda dá pra virar." |
| Sem internet | "Caiu a internet, ó. Tenta de novo." |
| Erro genérico | "Quebrou aqui. Avisa o admin se persistir." |
| Modal de confirmação | "Bora?" / "É pau ou é pedra?" |
| Botão primário padrão | "Salvar palpite" |
| Botão secundário | "Cancelar" |
| Empty state ranking | "Ninguém pontuou ainda. Aguenta firme." |

---

## 7. Design System

### 7.1 Paleta de Cores

```css
/* Brasil moderno, vibe CazéTV (sem dark mode) */
--bg-default: #FFFFFF;
--bg-surface: #F8F9FA; /* cards */
--bg-elevated: #FFFFFF; /* modais */

--primary: #FFD700; /* amarelo Brasil — CTAs, destaques */
--primary-hover: #E6C200;
--primary-fg: #0A0A0A; /* texto sobre primary */

--secondary: #009C3B; /* verde Brasil — sucesso, top 3 */
--secondary-hover: #007A2E;

--accent: #002776; /* azul Brasil — links, info */

--text-primary: #0A0A0A;
--text-secondary: #6B7280;
--text-disabled: #9CA3AF;

--border: #E5E7EB;
--divider: #F3F4F6;

--success: #16A34A; /* acerto */
--danger: #DC2626; /* erro, destrutivo */
--warning: #F59E0B; /* deadline próximo */
--info: #0EA5E9;
```

**Aplicações:**

- CTA primário (Salvar): fundo amarelo `#FFD700`, texto preto.
- Card de jogo TRAVADO: fundo `#F3F4F6`, ícone cadeado cinza.
- Badge de "MITOU": fundo verde `#16A34A`, texto branco.
- Banner de deadline iminente: fundo `#F59E0B`, texto preto.
- Pódio 1º lugar: ouro `#FFD700`; 2º prata `#C0C0C0`; 3º bronze `#CD7F32`.

### 7.2 Tipografia

```css
/* Importar do Google Fonts (gratuito) */
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

--font-display: 'Bricolage Grotesque', sans-serif; /* títulos, números do ranking */
--font-body: 'Inter', sans-serif; /* tudo o mais */

/* Escala */
--text-xs: 12px / 16px;
--text-sm: 14px / 20px;
--text-base: 16px / 24px; /* default body */
--text-lg: 18px / 28px;
--text-xl: 24px / 32px;
--text-2xl: 32px / 40px;
--text-3xl: 48px / 56px; /* placar grande, pontos */
```

### 7.3 Componentes-chave (shadcn/ui adaptados)

| Componente | Customização |
|---|---|
| Button (primary) | Amarelo Brasil, texto preto, font-weight 700, border-radius 12px, hover escurece |
| Card | Branco, border 1px `--border`, border-radius 16px, shadow leve |
| Input (placar) | Quadrado 56x56px, fonte display 32px center, border-radius 12px |
| Badge (tier) | Pílula compacta com cor por tier: T1 azul, T2 verde, T3 amarelo, T4 laranja, T5 cinza |
| Avatar | Circular, 40px default, border 2px amarelo para o usuário logado |
| Toast | Bottom-center no mobile, com microcopy zoeira |
| Modal | Slide-up no mobile, fade no desktop |

### 7.4 Iconografia

- Lucide React (gratuito, vem com shadcn).
- Ícones-chave: ⚽ futebol, 🏆 troféu, 🥇🥈🥉 pódio, ⏱️ deadline, ⚔️ confronto, 💰 pontos, 🔒 travado.
- Pode usar emojis nativos em microcopy para reforçar vibe Gen Z, mas não substituir ícones funcionais.

### 7.5 Logo concept

"Bolão na Mão" — mão segurando a Trionda (bola oficial Copa 2026).

- **Símbolo:** mão estilizada em silhueta preta, segurando uma bola de futebol com as três cores da Trionda (verde, vermelho, azul nos triângulos). Versão simplificada para favicon (só a mão + bola sólida amarela).
- **Wordmark:** "Bolão na Mão" em Bricolage Grotesque Bold 800, com "na" menor entre as duas palavras grandes.
- **Variações:** colorida (default), monocromática preta (para fundos amarelos), monocromática branca (para hero escuro se um dia).

> Premissa: vou assumir que a Trionda é a bola oficial conforme você mencionou. Se quiser, posso pesquisar e validar — mas para fins de logo, mesmo que seja uma bola genérica, o conceito da "mão segurando a bola" funciona.

### 7.6 Layout & responsividade

- Mobile-first, target inicial: 390px (iPhone 13/14/15 padrão).
- Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`.
- Container max-width no desktop: 600px (não vira "site largo", mantém vibe de app no centro).
- Padding global: 16px no mobile, 24px no desktop.
- Bottom nav fixo no mobile (Home / Apostas / Ranking / Perfil), top nav simples no desktop.

### 7.7 PWA (instalável como app)

- `manifest.json` com nome, ícones (192, 512), `display: standalone`, theme color amarelo.
- Service Worker via next-pwa para cache básico (offline mostra última versão do ranking visto).

---

## 8. Integrações e Operação

### 8.1 football-data.org

- Endpoint: `https://api.football-data.org/v4/competitions/WC/matches`
- Auth: header `X-Auth-Token: <free_token>`
- Limite: 10 req/min — usar cache agressivo.
- Sync strategy: Edge Function chamada por `pg_cron`:
  - Em dias sem jogo: 1x/dia (atualizar fixtures que possam ter mudado de horário).
  - Em dias de jogo: a cada 10 min entre 1h antes do primeiro até 2h depois do último jogo do dia.

### 8.2 Estrutura de jobs (`pg_cron`)

```sql
-- Sync com a API
select cron.schedule('sync_matches', '*/10 * * * *', $$ select sync_matches_from_api(); $$);

-- Recálculo de palpites após mudança de status
select cron.schedule('recalc_bets', '*/15 * * * *', $$ select recalc_finished_bets(); $$);

-- Snapshot diário do ranking (para gráfico V2)
select cron.schedule('ranking_snapshot', '0 6 * * *', $$ insert into ranking_snapshots ... $$);
```

### 8.3 Plano B — Modo Manual

- Admin clica "API fora do ar" em `/admin/api` → seta `app_config.api_status.available = false`.
- Crons param de tentar sync.
- Banner global aparece para todos os usuários: "Placares sendo atualizados manualmente."
- Admin entra em `/admin/jogos`, edita placar de cada jogo finalizado, salva.
- Trigger recalcula palpites.

### 8.4 Recálculo após edição admin

```sql
create or replace function recalc_match_bets(match_uuid uuid)
returns void as $$
begin
  update bets b
  set
    base_points = calculate_base_points(b.id, match_uuid),
    odd_multiplier = calculate_odd(match_uuid),
    total_points = calculate_base_points(b.id, match_uuid) * calculate_odd(match_uuid),
    updated_at = now()
  where b.match_id = match_uuid;
end;
$$ language plpgsql;
```

---

## 9. Roadmap

### 9.1 MVP — entregar 31/05/2026 (4 dias)

**Inegociáveis:**

- Login, cadastro com allowlist, recuperação de senha.
- CRUD de palpites da fase de grupos com cálculo de pontos em tempo real.
- Sync com football-data.org.
- Tela admin: gerenciar e-mails, editar placares, marcar API on/off, logs.
- Ranking básico (sem pontuação prevista).
- Minhas Apostas.
- Tela de perfil.
- Design system e tom de voz aplicados.
- PWA instalável.
- Seed das 48 seleções com tiers iniciais.

### 9.2 V1.1 — entregar antes de 11/06/2026 (Copa começa)

- Visualização de palpites alheios após deadline.
- Pontuação prevista no ranking.
- Mata-mata (palpites e cálculo).
- Polimento visual e correções de UX do MVP.

### 9.3 V2 — durante a Copa

- Bilhete Premiado (após sorteio dos 16-avos, fim de junho).
- Rebalanceamento de Tier dinâmico (Modelo A) — disparo manual via admin.
- Snapshots históricos do ranking para gráfico de evolução.

### 9.4 Permanente fora de escopo

- Pagamentos, prêmios em dinheiro.
- Detalhe de jogo, head-to-head, estatísticas.
- Comentários/feed/chat.
- Notificações push ou e-mail.
- Dark mode.
- Live score em tempo real.
- Outros torneios.

---

## 10. Premissas Assumidas (revisar)

Esses pontos não foram explicitados; assumi por padrão e estou listando para você confirmar.

1. **Idioma:** PT-BR exclusivo.
2. **Timezone:** America/Fortaleza (UTC-3) — todos os deadlines exibidos nesse fuso.
3. **Sem dinheiro/pagamentos:** zoeira pura entre amigos.
4. **Upload de foto:** JPG/PNG, máx 2MB, crop quadrado client-side antes do upload.
5. **Adicionar e-mails na allowlist:** admin insere via formulário um por um (sem CSV no MVP).
6. **Visibilidade de palpites alheios:** liberada apenas após o deadline daquele jogo específico (não da rodada inteira).
7. **Pontuação do Bilhete Premiado:** segui literalmente o briefing original (16 + 8 + 4 + 2 + 5 + 10 = não bate certo, vide nota em 5.7 — precisa confirmar valores exatos).
8. **Identidade visual:** trionda como referência da bola; se preferir bola genérica, é trivial trocar.
9. **Cron de rebalanceamento:** rodará via gatilho manual do admin (clica em "Rebalancear agora"), não automático — para você ter controle.
10. **Reset de senha:** flow padrão do Supabase Auth via e-mail.
11. **PWA:** sem ícones de apple-touch customizados no MVP — usa default.
12. **Logs do admin:** retém indefinidamente (volume é baixíssimo).

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| API football-data.org fora do ar / dados errados | Média | Alto | Modo manual + banner global |
| Deadline de 4 dias é muito apertado | Alta | Alto | Cortar V1.1 features se preciso; priorizar autenticação + palpite + ranking |
| Free tier do Supabase estourar (>500MB) | Baixa | Médio | Volume estimado <10MB para 20 usuários x ~100 palpites |
| Free tier do Vercel (100GB bandwidth) | Baixíssima | Baixo | App leve, 20 usuários |
| Senha fraca dos amigos | Média | Médio | Supabase Auth impõe mínimo 6 chars; orientar 8+ |
| Conflito de regras entre você (admin) e os amigos | Alta (é zoeira) | Baixo | Audit log resolve discussões objetivamente |
| Bug no cálculo de odds | Média | Alto | Testes unitários da função `calculate_odd()` antes do lançamento |
| Trionda como elemento visual com questão de direitos autorais | Baixa | Baixo | App é privado entre amigos, sem fins comerciais; se preocupar, usar bola genérica |

---

## 12. Próximos Passos Imediatos (hoje → domingo 31/05)

### Dia 1 (hoje, qua 27/05)

- Confirmar premissas listadas em §10.
- Criar projeto Supabase + Vercel.
- Criar repositório Next.js com Tailwind + shadcn/ui.
- Setup do schema do banco (tabelas + RLS).
- Importar 48 seleções e tabela de odds.

### Dia 2 (qui 28/05)

- Implementar Auth (cadastro com allowlist, login, esqueci senha).
- Implementar telas de cadastro/login com design system.

### Dia 3 (sex 29/05)

- Implementar CRUD de palpites + cálculo de pontos em tempo real.
- Implementar tela de Rodada.
- Integrar football-data.org (sync básico).

### Dia 4 (sáb 30/05)

- Implementar Ranking, Minhas Apostas, Perfil.
- Implementar tela Admin completa.
- Testes manuais com 2-3 amigos.

### Dia 5 (dom 31/05)

- Polimento + deploy + adicionar amigos na allowlist + smoke test.
- Lançar 🚀

---

**Fim do briefing.**

Dúvidas, ajustes, ou quer que eu detalhe alguma parte (schema completo com triggers, mock das telas em alta fidelidade, código exemplo de algum cálculo)? Me chama.
