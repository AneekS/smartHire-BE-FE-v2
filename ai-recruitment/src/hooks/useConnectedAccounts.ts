"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { connectedAccountsApi, type AccountProvider, type ConnectedAccount } from "@/lib/api-client";

/**
 * Manages the list of connected external accounts (GitHub, LinkedIn, etc.)
 */
export function useConnectedAccounts() {
  const { data, error, isLoading, mutate } = useSWR<ConnectedAccount[]>(
    "/api/v1/profile/connected-accounts",
    () => connectedAccountsApi.list()
  );

  const connect = async (payload: {
    provider: AccountProvider;
    profileUrl: string;
    username?: string;
    isOAuth?: boolean;
  }) => {
    try {
      await connectedAccountsApi.upsert(payload);
      toast.success("Account connected");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect account");
      throw e;
    }
  };

  const disconnect = async (provider: AccountProvider) => {
    try {
      await connectedAccountsApi.remove(provider);
      toast.success("Account disconnected");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect account");
      throw e;
    }
  };

  const isConnected = (provider: AccountProvider) =>
    (data ?? []).some((a) => a.provider === provider);

  const getAccount = (provider: AccountProvider) =>
    (data ?? []).find((a) => a.provider === provider) ?? null;

  return {
    accounts: data ?? [],
    isLoading,
    error,
    connect,
    disconnect,
    isConnected,
    getAccount,
    mutate,
  };
}
