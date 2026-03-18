import { Link, useParams } from 'react-router-dom'

export function MerchantSettings() {
  const { merchantSlug } = useParams<{ merchantSlug: string }>()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <p className="text-gray-900 font-medium">Merchant settings — coming in Phase 7</p>
        <Link
          to={`/m/${merchantSlug}`}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
