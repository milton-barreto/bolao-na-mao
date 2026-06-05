import { z } from 'zod'

/** E-mail isolado — usado no passo 1 do cadastro e na recuperação de senha */
export const emailSchema = z.object({
  email: z.email('Põe um e-mail de verdade, mano.'),
})
export type EmailInput = z.infer<typeof emailSchema>

/** Login: e-mail + senha */
export const loginSchema = z.object({
  email: z.email('Põe um e-mail de verdade, mano.'),
  password: z.string().min(1, 'Cadê a senha?'),
})
export type LoginInput = z.infer<typeof loginSchema>

/** Passo 2 do cadastro: nome + senha (a foto é tratada à parte) */
export const signupStep2Schema = z
  .object({
    name: z
      .string()
      .min(2, 'Teu nome é tão curtinho assim?')
      .max(40, 'Calma, nome gigante demais.'),
    password: z.string().min(6, 'Senha de no mínimo 6 caracteres, vai.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não batem, confere aí.',
    path: ['confirmPassword'],
  })
export type SignupStep2Input = z.infer<typeof signupStep2Schema>

/** Recuperação de senha: só e-mail */
export const resetSchema = emailSchema
export type ResetInput = z.infer<typeof resetSchema>

/** Nova senha (pós link de recovery) */
export const newPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha de no mínimo 6 caracteres, vai.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não batem, confere aí.',
    path: ['confirmPassword'],
  })
export type NewPasswordInput = z.infer<typeof newPasswordSchema>
