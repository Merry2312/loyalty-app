import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type Merchant = Tables<'merchants'>

export interface IssueStampResult {
  card_id: string
  stamp_count: number
  stamps_required: number
  reward_unlocked: boolean
}

export async function getMerchantBySlug(slug: string): Promise<Merchant> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function checkIsStaff(merchantId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_merchant_staff', {
    p_merchant_id: merchantId,
  })
  if (error) throw error
  return data ?? false
}

export async function issueStamp(
  merchantId: string,
  identifier: string
): Promise<IssueStampResult> {
  const { data, error } = await supabase.rpc('issue_stamp', {
    p_merchant_id: merchantId,
    p_identifier: identifier,
  })
  if (error) throw error
  return data as IssueStampResult
}
