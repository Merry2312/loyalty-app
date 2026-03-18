import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') ?? '/passport'

    // Supabase exchanges the token from the URL hash automatically on client load.
    // Poll briefly for the session to be ready.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(next, { replace: true })
      } else {
        // Listen for the SIGNED_IN event in case the exchange is still in flight
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            navigate(next, { replace: true })
          }
        })
        // Fallback: if no session after 5 s, send to login
        const timeout = setTimeout(() => {
          subscription.unsubscribe()
          navigate('/login', { replace: true })
        }, 5000)
        return () => {
          clearTimeout(timeout)
          subscription.unsubscribe()
        }
      }
    })
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
