import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPlatformUsers, updateUserStatus, PlatformUsersFilters } from '../api/users';
import toast from 'react-hot-toast';

export function usePlatformUsers(filters: PlatformUsersFilters = {}) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => listPlatformUsers(filters),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'blocked' }) =>
      updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Статус пользователя обновлён');
    },
    onError: () => {
      toast.error('Ошибка при обновлении статуса');
    },
  });
}
