import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export function Login() {
  const [searchParams] = useSearchParams()
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const next = searchParams.get('next') ?? '/passport'
  const prefillEmail = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  })

  async function onSubmit({ email }: FormValues) {
    setSubmitError(null)
    const redirectTo = `${import.meta.env.VITE_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) {
      setSubmitError(error.message)
      return
    }
    setSentEmail(email)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-500">
            We sent a magic link to{' '}
            <span className="font-medium text-gray-700">{sentEmail}</span>. Click
            it to sign in.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Passport</h1>
          <p className="text-sm text-gray-500">Sign in to view your loyalty stamps.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            Send magic link
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400">
          No password needed. We'll email you a sign-in link.
        </p>
      </div>
    </div>
  )
}
