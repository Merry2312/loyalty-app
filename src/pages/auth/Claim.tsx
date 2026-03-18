import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function Claim() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = searchParams.get('email') ?? ''

  useEffect(() => {
    if (loading || !session || !email || claimed) return

    setClaiming(true)
    setError(null)

    supabase
      .rpc('claim_stamps', { p_identifier: email, p_user_id: session.user.id })
      .then(({ error }) => {
        if (error) {
          setError(error.message)
        } else {
          setClaimed(true)
        }
        setClaiming(false)
      })
  }, [loading, session, email, claimed])

  if (loading || claiming) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
          <div className="text-4xl">☕</div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">You have stamps waiting</h1>
            <p className="text-sm text-gray-500">
              Sign in to claim your stamps and track your rewards.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              navigate(
                `/login?next=${encodeURIComponent(`/claim?email=${encodeURIComponent(email)}`)}`
              )
            }
          >
            Sign in to claim
          </Button>
        </div>
      </div>
    )
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
          <div className="text-4xl">🎉</div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">Stamps claimed!</h1>
            <p className="text-sm text-gray-500">Your stamps have been added to your passport.</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => navigate('/passport')}>
            View my passport
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
          <div className="text-4xl">⚠️</div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/passport')}
          >
            Go to passport
          </Button>
        </div>
      </div>
    )
  }

  return null
}
