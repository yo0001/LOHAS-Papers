"use client";

import { useState, useEffect, useCallback } from "react";
import type { BYOKProvider } from "@/lib/byok-models";

const STORAGE_KEY = "lohas_byok_config";

export interface BYOKConfig {
  provider: BYOKProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
}

function loadConfig(): BYOKConfig | null {
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

export function useBYOK() {
  const [config, setConfigState] = useState<BYOKConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setConfigState(loadConfig());
    setLoaded(true);
  }, []);

  const isBYOKEnabled = loaded && config !== null && config.enabled;

  const setBYOKConfig = useCallback((newConfig: BYOKConfig) => {
    setConfigState(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, []);

  const clearBYOK = useCallback(() => {
    setConfigState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateModel = useCallback((model: string) => {
    if (!config) return;
    const updated = { ...config, model };
    setConfigState(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [config]);

  const toggleEnabled = useCallback((enabled: boolean) => {
    if (!config) return;
    const updated = { ...config, enabled };
    setConfigState(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [config]);

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
 * Used in the API client.
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
