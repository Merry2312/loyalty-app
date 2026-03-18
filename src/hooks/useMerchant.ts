import { useQuery } from '@tanstack/react-query'
import { getMerchantBySlug, checkIsStaff } from '../lib/merchants'
import { useAuth } from './useAuth'

export function useMerchant(slug: string) {
  const { session } = useAuth()

  const merchantQuery = useQuery({
    queryKey: ['merchant', slug],
    queryFn: () => getMerchantBySlug(slug),
    enabled: !!slug,
  })

  const isStaffQuery = useQuery({
    queryKey: ['merchant-staff', merchantQuery.data?.id, session?.user.id],
    queryFn: () => checkIsStaff(merchantQuery.data!.id),
    enabled: !!merchantQuery.data?.id && !!session,
  })

  return {
    merchant: merchantQuery.data,
    isStaff: isStaffQuery.data ?? false,
    loading: merchantQuery.isLoading || (!!merchantQuery.data && isStaffQuery.isLoading),
    error: merchantQuery.error ?? isStaffQuery.error,
  }
}
