# Perfil Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar a tela `/perfil` para um layout coeso — avatar+nome em linha, senha colapsada por padrão, e pontos de cada rodada sempre visíveis no cabeçalho do acordeão.

**Architecture:** Três componentes são modificados sem mudar lógica de negócio ou fetch de dados. `AvatarUpload` ganha modo compacto. `ProfileForm` reorganiza seções e adiciona estado de colapso para senha. `ExtratoView` exibe pontos no header da rodada independente do estado aberto/fechado.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS 4, shadcn/ui (ChevronDown, cn)

---

## Mapa de arquivos

| Arquivo | Ação | O que muda |
|---|---|---|
| `components/avatar-upload.tsx` | Modificar | Adiciona prop `compact?: boolean` para modo inline (48px, sem link de texto abaixo) |
| `components/profile-form.tsx` | Modificar | Layout do `ProfileDataSection` (avatar inline + email), acordeão para seção de senha |
| `components/extrato-view.tsx` | Modificar | Header da rodada sempre exibe pontos: verde se > 0, "—" se pendente |

---

## Task 1: Modo compacto no AvatarUpload

**Arquivo:** `components/avatar-upload.tsx`

Adiciona `compact?: boolean` à interface. Em modo compact, o avatar é 48×48px e o link de texto abaixo fica oculto. A lógica de crop/dialog não muda.

- [ ] **Passo 1: Adicionar prop `compact` à interface**

Em `components/avatar-upload.tsx`, alterar a interface `AvatarUploadProps`:

```tsx
interface AvatarUploadProps {
  onCropped: (file: File) => void
  name?: string
  currentUrl?: string
  compact?: boolean
}
```

- [ ] **Passo 2: Aplicar prop no JSX**

Alterar a função `AvatarUpload` para receber `compact` e aplicar no render:

```tsx
export function AvatarUpload({ onCropped, name, currentUrl, compact }: AvatarUploadProps) {
```

Substituir o bloco `return (...)` existente (começando em `<div className="flex flex-col items-center gap-3">`):

```tsx
  return (
    <div className={compact ? undefined : 'flex flex-col items-center gap-3'}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative"
        aria-label="Escolher foto de perfil"
      >
        <Avatar className={compact ? 'h-12 w-12' : 'h-24 w-24'}>
          {preview ? (
            <AvatarImage src={preview} alt="Prévia do avatar" />
          ) : currentUrl ? (
            <AvatarImage src={currentUrl} alt="Foto de perfil" />
          ) : null}
          <AvatarFallback className={compact ? 'text-lg' : 'text-2xl'}>{initial}</AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className={compact ? 'h-4 w-4 text-white' : 'h-6 w-6 text-white'} />
        </span>
      </button>

      {!compact && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          {preview || currentUrl ? 'Trocar foto' : 'Bora colocar uma foto'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onSelectFile}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        {/* conteúdo do Dialog não muda */}
```

> O conteúdo interno do `<Dialog>` permanece exatamente igual ao original — só o wrapper e o avatar button mudam.

- [ ] **Passo 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros relacionados a `AvatarUpload`.

- [ ] **Passo 4: Commit**

```bash
git add components/avatar-upload.tsx
git commit -m "feat: add compact mode to AvatarUpload"
```

---

## Task 2: Novo layout do ProfileDataSection + acordeão de senha

**Arquivo:** `components/profile-form.tsx`

Mudanças:
1. `ProfileDataSection`: avatar compacto + nome/email em linha, sem título "Quem sou eu"
2. `ProfileForm`: seção de senha vira acordeão controlado por `useState`, fechado por padrão
3. Importações: adicionar `ChevronDown` e `useUser` já tem `user` disponível

- [ ] **Passo 1: Adicionar imports necessários**

No topo de `components/profile-form.tsx`, a linha de imports do lucide-react está assim:

```tsx
import { LogOut } from 'lucide-react'
```

Alterar para:

```tsx
import { ChevronDown, LogOut } from 'lucide-react'
```

E adicionar `cn` ao import de utils (se não existir):

```tsx
import { cn } from '@/lib/utils'
```

- [ ] **Passo 2: Atualizar assinatura e props de ProfileDataSection**

`ProfileDataSection` precisa receber `email` para exibir abaixo do nome. Localizar:

```tsx
function ProfileDataSection({
  profile,
  refreshProfile,
}: {
  profile: Profile
  refreshProfile: () => Promise<void>
}) {
```

Substituir por:

```tsx
function ProfileDataSection({
  profile,
  email,
  refreshProfile,
}: {
  profile: Profile
  email: string | null
  refreshProfile: () => Promise<void>
}) {
```

- [ ] **Passo 3: Substituir o JSX de ProfileDataSection**

Localizar e substituir o bloco `return (...)` dentro de `ProfileDataSection` (da linha `<section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">` até o `</section>` correspondente):

```tsx
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <AvatarUpload
          compact
          name={name}
          currentUrl={profile.avatar_url ?? undefined}
          onCropped={setAvatar}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{profile.name}</p>
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Teu nome ou apelido"
        />
      </div>

      <Button onClick={handleSaveData} disabled={savingData} className="mt-3 w-full">
        {savingData ? 'Salvando...' : 'Salvar'}
      </Button>
    </section>
  )
```

- [ ] **Passo 4: Adicionar `user` ao destructure de `useUser()` em ProfileForm**

Localizar dentro de `ProfileForm`:

```tsx
const { profile, isLoading, refreshProfile } = useUser()
```

Substituir por:

```tsx
const { profile, user, isLoading, refreshProfile } = useUser()
```

- [ ] **Passo 5: Adicionar estado de colapso da senha em ProfileForm**

Dentro de `ProfileForm`, logo após a linha anterior, adicionar:

```tsx
const [pwdOpen, setPwdOpen] = useState(false)
```

- [ ] **Passo 6: Atualizar render de ProfileForm — passar email e nova seção de senha**

Localizar o bloco `return (...)` de `ProfileForm` e substituir integralmente:

```tsx
  return (
    <div className="flex flex-col gap-4">
      <ProfileDataSection
        profile={profile}
        email={user?.email ?? null}
        refreshProfile={refreshProfile}
      />

      {/* Senha — acordeão */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setPwdOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/50"
        >
          <span className="font-semibold">Mudar senha</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              pwdOpen && 'rotate-180',
            )}
          />
        </button>

        {pwdOpen && (
          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="flex flex-col gap-4 border-t border-border px-5 pb-5 pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirma aí</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="digita de novo"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={savingPwd} variant="outline" className="w-full">
              {savingPwd ? 'Trocando...' : 'Trocar'}
            </Button>
          </form>
        )}
      </div>

      {/* Logout */}
      <form action={logout}>
        <Button type="submit" variant="ghost" className="w-full text-danger hover:text-danger">
          <LogOut className="h-4 w-4" /> Sair fora 👋
        </Button>
      </form>
    </div>
  )
```

- [ ] **Passo 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `profile-form.tsx`.

- [ ] **Passo 8: Commit**

```bash
git add components/profile-form.tsx
git commit -m "feat: refactor ProfileForm layout — inline avatar, password accordion"
```

---

## Task 3: Pontos sempre visíveis no header de rodada do ExtratoView

**Arquivo:** `components/extrato-view.tsx`

O header de cada rodada deve sempre exibir a pontuação total — verde se `roundTotal > 0`, `—` cinza se não há jogos finalizados ainda.

- [ ] **Passo 1: Substituir o bloco condicional de pontos no header**

Localizar o trecho abaixo (linhas 68–78 aprox.):

```tsx
              {finished.length > 0 && (
                <span
                  className={cn(
                    'font-display text-sm font-bold',
                    roundTotal > 0 ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {roundTotal > 0 ? '+' : ''}
                  {roundTotal.toFixed(2).replace('.', ',')}
                </span>
              )}
```

Substituir por:

```tsx
              <span
                className={cn(
                  'font-display text-sm font-bold',
                  finished.length > 0 && roundTotal > 0
                    ? 'text-success'
                    : 'text-muted-foreground',
                )}
              >
                {finished.length > 0
                  ? `${roundTotal > 0 ? '+' : ''}${roundTotal.toFixed(2).replace('.', ',')}`
                  : '—'}
              </span>
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `extrato-view.tsx`.

- [ ] **Passo 3: Commit**

```bash
git add components/extrato-view.tsx
git commit -m "feat: always show round points in ExtratoView header"
```

---

## Task 4: Verificação manual no browser

- [ ] **Passo 1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Passo 2: Abrir `/perfil` e checar**

1. Avatar aparece compacto (48px) à esquerda, nome e email à direita
2. Não existe mais o título "Quem sou eu"
3. Campo de nome e botão Salvar aparecem abaixo do bloco de avatar
4. "Mudar senha" aparece como acordeão fechado — clicar expande campos
5. Seção "Balanço" aparece abaixo com cada rodada em acordeão
6. Cada rodada, mesmo colapsada, exibe a pontuação total no cabeçalho
7. Rodadas sem jogos finalizados exibem "—" no cabeçalho
8. Botão logout no final, vermelho, funciona

- [ ] **Passo 3: Testar upload de avatar**

Clicar no avatar compacto → dialog de crop abre → confirmar → preview atualiza inline.
