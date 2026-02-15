"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBYOK, type BYOKConfig } from "@/hooks/useBYOK";
import {
  BYOK_PROVIDERS,
  getModelsForProvider,
  getDefaultModel,
  formatPrice,
  validateKeyFormat,
  type BYOKProvider,
} from "@/lib/byok-models";

const BYOK_LABELS: Record<string, Record<string, string>> = {
  ja: {
    title: "BYOK設定（自分のAPIキーを使う）",
    description: "自分のAPIキーを使うと、クレジット消費なしでAI検索を利用できます。キーはブラウザにのみ保存され、サーバーには保存されません。",
    provider: "プロバイダー",
    apiKey: "APIキー",
    model: "モデル",
    save: "保存",
    delete: "削除",
    enabled: "BYOK有効",
    disabled: "BYOK無効",
    invalidKey: "APIキーの形式が正しくありません",
    saved: "設定を保存しました",
    deleted: "設定を削除しました",
    recommended: "おすすめ",
    inputPrice: "入力",
    outputPrice: "出力",
    perMTok: "/MTok",
    securityNote: "🔒 キーはブラウザのlocalStorageにのみ保存されます",
  },
  en: {
    title: "BYOK Settings (Bring Your Own Key)",
    description: "Use your own API key for AI search without consuming credits. Keys are stored only in your browser, never on our servers.",
    provider: "Provider",
    apiKey: "API Key",
    model: "Model",
    save: "Save",
    delete: "Delete",
    enabled: "BYOK Enabled",
    disabled: "BYOK Disabled",
    invalidKey: "Invalid API key format",
    saved: "Settings saved",
    deleted: "Settings deleted",
    recommended: "Recommended",
    inputPrice: "Input",
    outputPrice: "Output",
    perMTok: "/MTok",
    securityNote: "🔒 Keys are stored only in your browser's localStorage",
  },
};

function getLabels(locale: string) {
  return BYOK_LABELS[locale] || BYOK_LABELS["en"];
}

function maskKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return key.slice(0, 7) + "•••" + key.slice(-4);
}

export default function BYOKSettings() {
  const { locale } = useLanguage();
  const labels = getLabels(locale);
  const { byokConfig, setBYOKConfig, clearBYOK, loaded } = useBYOK();

  const [provider, setProvider] = useState<BYOKProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initialize from saved config
  useEffect(() => {
    if (loaded && byokConfig) {
      setProvider(byokConfig.provider);
      setApiKey(byokConfig.apiKey);
      setModel(byokConfig.model);
    }
  }, [loaded, byokConfig]);

  // When provider changes, update default model
  useEffect(() => {
    if (!byokConfig || byokConfig.provider !== provider) {
      const defaultModel = getDefaultModel(provider);
      if (defaultModel) setModel(defaultModel.id);
    }
  }, [provider, byokConfig]);

  const models = getModelsForProvider(provider);
  const providerInfo = BYOK_PROVIDERS.find((p) => p.id === provider);

  const handleSave = () => {
    setError("");
    setSuccess("");

    if (!apiKey.trim()) {
      setError(labels.invalidKey);
      return;
    }

    if (!validateKeyFormat(provider, apiKey.trim())) {
      setError(`${labels.invalidKey} (${providerInfo?.keyHint})`);
      return;
    }

    const config: BYOKConfig = {
      provider,
      apiKey: apiKey.trim(),
      model,
      enabled: true,
    };
    setBYOKConfig(config);
    setSuccess(labels.saved);
    setShowKey(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDelete = () => {
    clearBYOK();
    setApiKey("");
    setModel(getDefaultModel("anthropic").id);
    setProvider("anthropic");
    setShowKey(false);
    setError("");
    setSuccess(labels.deleted);
    setTimeout(() => setSuccess(""), 3000);
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
          🔑 {labels.title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{labels.description}</p>
      </div>

      {/* Provider selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {labels.provider}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BYOK_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                provider === p.id
                  ? "border-navy-600 bg-navy-50 text-navy-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* API Key input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {labels.apiKey}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError("");
            }}
            placeholder={providerInfo?.keyHint}
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        {byokConfig && !showKey && byokConfig.apiKey && (
          <p className="text-xs text-gray-400 mt-1 font-mono">
            {maskKey(byokConfig.apiKey)}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{labels.securityNote}</p>
      </div>

      {/* Model selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {labels.model}
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent bg-white"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.recommended ? "⭐ " : ""}{m.name} — {labels.inputPrice}: {formatPrice(m.inputPrice)}{labels.perMTok} / {labels.outputPrice}: {formatPrice(m.outputPrice)}{labels.perMTok}
            </option>
          ))}
        </select>
      </div>

      {/* Error / Success messages */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          {labels.save}
        </button>
        {byokConfig && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            {labels.delete}
          </button>
        )}
      </div>

      {/* Current status */}
      {byokConfig && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${byokConfig.enabled ? "bg-green-500" : "bg-gray-300"}`} />
          <span className="text-gray-600">
            {byokConfig.enabled ? labels.enabled : labels.disabled}
          </span>
          {byokConfig.enabled && (
            <span className="text-gray-400">
              — {BYOK_PROVIDERS.find(p => p.id === byokConfig.provider)?.name} / {byokConfig.model}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
