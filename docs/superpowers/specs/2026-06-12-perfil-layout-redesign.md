# Spec: Redesign da Tela de Perfil

**Data:** 2026-06-12
**Status:** Aprovado

## Problema

Os componentes da tela de perfil (`/perfil`) estão visualmente desconexos — três cards soltos empilhados sem hierarquia clara, senha ocupando espaço desnecessário, e o balanço de rodadas colapsado sem exibir as informações-chave.

## Solução aprovada: Layout B — Compacto com senha colapsável

### Estrutura da página

```
Meu Perfil (h1)
│
├── Card: Perfil
│   ├── Avatar (upload) + Nome + E-mail (em linha)
│   ├── [divider]
│   └── Campo Nome + botão Salvar
│
├── Acordeão: Mudar senha (fechado por padrão)
│   └── [expandido] Campo nova senha + confirmação + botão Trocar
│
├── Seção: Balanço
│   └── Acordeão por rodada (todos abertos por padrão)
│       ├── Header (sempre visível): chevron + "Rodada N" + "X palpites" + pontos totais
│       │   - Pontos: "+12,50" em verde se > 0, "—" em cinza se pendente
│       └── Body (expansível): lista de apostas com flags, placar, palpite, badge, pts
│
└── Botão Logout (ghost, vermelho)
```

### Mudanças por componente

**`components/profile-form.tsx`**
- `ProfileDataSection`: avatar e nome/email lado a lado com `flex-row`; remover título "Quem sou eu"; manter lógica de upload intacta
- Seção de senha: envolver em acordeão controlado por estado local, fechado por padrão
- Logout: manter ao final do componente

**`components/extrato-view.tsx`**
- Header de cada rodada: adicionar contador de palpites (`X palpites`) e total de pontos visível mesmo colapsado
- Total de pontos: verde (`text-success`) se `roundTotal > 0`, traço `—` em `text-muted-foreground` se nenhum jogo finalizado

**`app/(app)/perfil/page.tsx`**
- Sem mudança na lógica de dados; apenas garantir que o título "Balanço" fique na page e não dentro do componente

## O que NÃO muda

- Toda a lógica de fetch, actions e server components
- Upload/crop de avatar (`AvatarUpload`)
- Validação de formulários (react-hook-form + zod)
- Cálculo de pontos (SQL canônico)
- Dados exibidos no extrato

## Critério de sucesso

- Avatar e nome aparecem em linha no card de perfil
- "Mudar senha" inicia colapsado e expande ao clicar
- Cada acordeão de rodada mostra pontos totais no header independente do estado aberto/fechado
- Rodadas sem pontuação mostram "—" no header
