'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFloorPlans, saveFloorPlans } from '@/lib/api/floor-plans';
import type { FloorPlansConfig } from '@sardoba/shared';

const KEY = ['floor-plans'];

export function useFloorPlans() {
  return useQuery({
    queryKey: KEY,
    queryFn: getFloorPlans,
  });
}

export function useSaveFloorPlans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: FloorPlansConfig) => saveFloorPlans(config),
    onSuccess: (data) => {
      queryClient.setQueryData(KEY, data);
    },
  });
}
