import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMerchant } from '../../hooks/useMerchant'
import { issueStamp, type IssueStampResult } from '../../lib/merchants'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/utils'

const schema = z.object({
  email: z.email('Enter a valid email address'),
})
type FormValues = z.infer<typeof schema>

function StampDots({ count, required }: { count: number; required: number }) {
  const capped = Math.min(count, required)
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: required }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-colors',
            i < capped ? 'bg-black border-black' : 'bg-white border-gray-300'
          )}
        />
      ))}
    </div>
  )
}

function StampResult({
  result,
  email,
  onDismiss,
}: {
  result: IssueStampResult
  email: string
  onDismiss: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {result.reward_unlocked && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-amber-800">Reward unlocked!</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Ask the customer to show this screen to redeem.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-gray-500">Stamp issued to</p>
        <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          {result.stamp_count} / {result.stamps_required} stamps
        </p>
        <StampDots count={result.stamp_count} required={result.stamps_required} />
      </div>

      <Button variant="ghost" size="sm" className="w-full" onClick={onDismiss}>
        Issue another stamp
      </Button>
    </div>
  )
}

export function MerchantDashboard() {
  const { merchantSlug } = useParams<{ merchantSlug: string }>()
  const { merchant, isStaff, loading, error } = useMerchant(merchantSlug!)
  const [result, setResult] = useState<{ data: IssueStampResult; email: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit({ email }: FormValues) {
    setSubmitError(null)
    try {
      const data = await issueStamp(merchant!.id, email)
      setResult({ data, email })
      reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to issue stamp')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-medium">Merchant not found</p>
          <p className="text-sm text-gray-500">{String(error ?? 'Unknown error')}</p>
        </div>
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-medium">Not authorized</p>
          <p className="text-sm text-gray-500">
            You are not a staff member for {merchant.name}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: `3px solid ${merchant.brand_color}` }}
      >
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Staff dashboard</p>
          <h1 className="text-lg font-bold text-gray-900">{merchant.name}</h1>
        </div>
        <Link
          to={`/m/${merchant.slug}/settings`}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Settings
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-sm mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">Issue a stamp</h2>
          <p className="text-sm text-gray-500">Enter the customer's email address.</p>
        </div>

        {result ? (
          <StampResult
            result={result.data}
            email={result.email}
            onDismiss={() => setResult(null)}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Customer email"
              placeholder="customer@example.com"
              autoComplete="off"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            {submitError && <p className="text-xs text-red-500">{submitError}</p>}
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full"
              style={{ backgroundColor: merchant.brand_color, borderColor: merchant.brand_color }}
            >
              Issue stamp
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
