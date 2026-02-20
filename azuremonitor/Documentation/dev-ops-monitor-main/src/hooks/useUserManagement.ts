import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'editor' | 'viewer' | null;
  createdAt: string;
  lastSignIn: string | null;
}

interface CreateUserInput {
  email: string;
  password: string;
  fullName?: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface UpdateRoleInput {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
}

export function useUserManagement() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['managed-users'],
    queryFn: async (): Promise<ManagedUser[]> => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch users');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.users;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create',
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (input: UpdateRoleInput) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update-role',
          userId: input.userId,
          role: input.role,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update role');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete',
          userId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    createUser: createUserMutation.mutate,
    isCreating: createUserMutation.isPending,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,
  };
}
