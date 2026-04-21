"use client";

import useSWR, { mutate as swrMutate } from "swr";
import { toast } from "sonner";
import { preferredRolesApi, type PreferredRoleSignal } from "@/lib/api-client";

async function revalidatePreferenceCaches() {
  await swrMutate("/api/profile/preferences");
}

export function usePreferredRoles() {
  const { data, error, isLoading, mutate } = useSWR("/api/preferred-roles", () => preferredRolesApi.list());

  const addRole = async (role: string, priority: number) => {
    try {
      await preferredRolesApi.add(role, priority);
      await mutate();
      await revalidatePreferenceCaches();
      toast.success("Preferred role added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add role");
      throw err;
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await preferredRolesApi.remove(id);
      await mutate();
      await revalidatePreferenceCaches();
      toast.success("Role removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
      throw err;
    }
  };

  const roles = (data?.roles ?? []) as PreferredRoleSignal[];

  return {
    roles,
    isLoading,
    error,
    addRole,
    deleteRole,
    mutate,
  };
}
