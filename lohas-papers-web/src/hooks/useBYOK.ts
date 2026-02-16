"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { BYOKProvider } from "@/lib/byok-models";

const STORAGE_KEY = "lohas_byok_config";

export interface BYOKConfig {
  provider: BYOKProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
}

function loadConfigFromLocalStorage(): BYOKConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.provider && parsed.apiKey && parsed.model) {
      return parsed as BYOKConfig;
    }
    return null;
  } catch {
    return null;
  }
}

function saveConfigToLocalStorage(config: BYOKConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function removeConfigFromLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

async function fetchConfigFromSupabase(): Promise<BYOKConfig | null> {
  try {
    const res = await fetch("/api/byok");
    if (!res.ok) return null;
    const data = await res.json();
    return data.byok_config ?? null;
  } catch {
    return null;
  }
}

async function saveConfigToSupabase(config: BYOKConfig): Promise<boolean> {
  try {
    const res = await fetch("/api/byok", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteConfigFromSupabase(): Promise<boolean> {
  try {
    const res = await fetch("/api/byok", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useBYOK() {
  const { user } = useAuth();
  const [config, setConfigState] = useState<BYOKConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const syncedRef = useRef(false);

  // Load from localStorage immediately, then sync from Supabase if logged in
  useEffect(() => {
    const localConfig = loadConfigFromLocalStorage();
    setConfigState(localConfig);
    setLoaded(true);
  }, []);

  // Sync from Supabase when user is available
  useEffect(() => {
    if (!user || syncedRef.current) return;
    syncedRef.current = true;

    fetchConfigFromSupabase().then((remoteConfig) => {
      if (remoteConfig) {
        // Remote config takes priority — update local state and localStorage
        setConfigState(remoteConfig);
        saveConfigToLocalStorage(remoteConfig);
      } else {
        // No remote config — push local config to Supabase if it exists
        const localConfig = loadConfigFromLocalStorage();
        if (localConfig) {
          saveConfigToSupabase(localConfig);
        }
      }
    });
  }, [user]);

  // Reset sync flag when user changes (logout/login with different account)
  useEffect(() => {
    syncedRef.current = false;
  }, [user?.id]);

  const isBYOKEnabled = loaded && config !== null && config.enabled;

  const setBYOKConfig = useCallback(
    (newConfig: BYOKConfig) => {
      setConfigState(newConfig);
      saveConfigToLocalStorage(newConfig);
      if (user) {
        saveConfigToSupabase(newConfig);
      }
    },
    [user],
  );

  const clearBYOK = useCallback(() => {
    setConfigState(null);
    removeConfigFromLocalStorage();
    if (user) {
      deleteConfigFromSupabase();
    }
  }, [user]);

  const updateModel = useCallback(
    (model: string) => {
      if (!config) return;
      const updated = { ...config, model };
      setConfigState(updated);
      saveConfigToLocalStorage(updated);
      if (user) {
        saveConfigToSupabase(updated);
      }
    },
    [config, user],
  );

  const toggleEnabled = useCallback(
    (enabled: boolean) => {
      if (!config) return;
      const updated = { ...config, enabled };
      setConfigState(updated);
      saveConfigToLocalStorage(updated);
      if (user) {
        saveConfigToSupabase(updated);
      }
    },
    [config, user],
  );

  return {
    byokConfig: config,
    isBYOKEnabled,
    loaded,
    setBYOKConfig,
    clearBYOK,
    updateModel,
    toggleEnabled,
  };
}

/**
 * Static helper to get BYOK headers for API requests (non-hook context).
 * Used in the API client. Reads from localStorage only.
 */
export function getBYOKHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const config = JSON.parse(raw) as BYOKConfig;
    if (!config.enabled || !config.apiKey) return {};
    return {
      "X-BYOK-Provider": config.provider,
      "X-BYOK-Key": config.apiKey,
      "X-BYOK-Model": config.model,
    };
  } catch {
    return {};
  }
}
