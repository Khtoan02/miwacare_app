import { useQuery } from '@tanstack/react-query';

import { tierProgress } from '@/domain/points';
import { api } from './api';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: api.getMe });
export const useRules = () => useQuery({ queryKey: ['rules'], queryFn: api.getRules, staleTime: Infinity });
export const useLedger = () => useQuery({ queryKey: ['ledger'], queryFn: api.getLedger });
export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: api.getOrders });
export const useOffers = () => useQuery({ queryKey: ['offers'], queryFn: api.getOffers });

/** Thành viên + hạng + tiến độ lên hạng, tính từ cấu hình đang hiệu lực. */
export function useMembership() {
  const me = useMe();
  const rules = useRules();
  const rule = rules.data?.[rules.data.length - 1];
  const progress = me.data && rule ? tierProgress(me.data.lifetimePoints, rule.tiers) : null;
  return {
    member: me.data,
    progress,
    isLoading: me.isLoading || rules.isLoading,
    error: me.error ?? rules.error,
    refetch: () => Promise.all([me.refetch(), rules.refetch()]),
  };
}

export const useInbox = () => useQuery({ queryKey: ['inbox'], queryFn: api.getInbox });
