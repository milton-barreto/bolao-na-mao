# /frontend-design — Revisão de UX/UI

Você é um especialista em design de interfaces mobile-first para apps de bolão esportivo.
Revise o código do componente ou página indicada e aplique melhorias seguindo os critérios abaixo.

## Design System do projeto

- **Cores primárias**: `--primary` (#FFD700 amarelo), `--brand-green` (#009C3B), `--brand-blue` (#002776)
- **Tipografia**: `font-display` (Bricolage Grotesque) para títulos/placares, `font-sans` (Inter) para corpo
- **Border radius**: `rounded-2xl` para cards principais, `rounded-xl` para sub-elementos, `rounded-full` para pills
- **Espaçamento**: gap-3/gap-4 entre cards, p-4 dentro de cards, py-6 em páginas
- **Tokens semânticos**: `bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`

## Critérios de revisão obrigatórios

### 1. Consistência Visual
- Todos os cards devem usar `rounded-2xl border border-border bg-card p-4`
- Sub-elementos internos ao card: `rounded-xl bg-muted`
- Pills/filtros: `rounded-full` com estados hover explícitos
- Badges de status: usar variantes do `Badge` do projeto (acertou_placar, acertou_resultado, errou, travado)

### 2. Hierarquia de Informação
- Cabeçalho do card: metadados pequenos (grupo, data) em `text-xs text-muted-foreground`
- Conteúdo principal: nomes de times em `text-sm font-semibold`, placares em `font-display font-bold`
- Ações (botões): no rodapé do card, alinhados com `justify-between`

### 3. Mobile-first (max-width 600px)
- Testar layout em tela estreita — sem overflow horizontal
- Ícones: `h-4 w-4` (padrão), `h-5 w-5` (nav)
- Flags de times: `size={26}` em cards compactos, `size={30}` em cards principais
- Inputs de placar: `h-14 w-14` (padrão do InputScore)

### 4. Estados interativos
- Botões: sempre com `disabled` state, `isPending` com texto "Salvando..."
- Links: usar `Button asChild` para navegação estilizada
- Hover: `transition-colors` em todos os elementos clicáveis
- Foco: não remover outline/ring (acessibilidade)

### 5. Empty states
- Usar emoji grande (3xl/4xl) + texto principal + texto secundário + ação opcional
- Envolver em `flex flex-col items-center gap-3 py-12 text-center`

### 6. Acessibilidade
- Botões sem texto: sempre `title` ou `aria-label`
- Imagens decorativas: `aria-hidden`
- Inputs: sempre com `aria-label`

## O que NÃO fazer

- Não usar `scale-X` para dar destaque visual — usar tamanho diferente de avatar/fonte
- Não usar `style={{}}` inline para cores que existem como tokens Tailwind
- Não usar `var(--xxx)` diretamente em className — usar o token Tailwind mapeado
- Não remover `dark:` classes se existirem (mas este projeto não tem dark mode)
- Não inventar novas cores fora do design system

## Processo de aplicação

1. Leia o componente/página inteiro antes de modificar
2. Identifique os problemas de alinhamento, espaçamento e hierarquia
3. Aplique as correções seguindo as convenções acima
4. Verifique se há inconsistências com outros componentes similares no projeto
5. Confirme que não quebrou nenhum tipo TypeScript

$ARGUMENTS
