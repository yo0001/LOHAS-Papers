"use client";

import { useState, useRef, useEffect } from "react";
import { useBYOK } from "@/hooks/useBYOK";
import {
  getModelsForProvider,
  formatPrice,
  BYOK_PROVIDERS,
  type BYOKModel,
} from "@/lib/byok-models";

export default function ModelSelector() {
  const { byokConfig, isBYOKEnabled, updateModel } = useBYOK();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isBYOKEnabled || !byokConfig) return null;

  const models = getModelsForProvider(byokConfig.provider);
  const currentModel = models.find((m) => m.id === byokConfig.model);
  const providerInfo = BYOK_PROVIDERS.find((p) => p.id === byokConfig.provider);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-navy-600 bg-navy-50 border border-navy-200 rounded-lg hover:bg-navy-100 transition-colors"
        title="BYOK Model"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="max-w-[120px] truncate">
          {currentModel?.name ?? byokConfig.model}
        </span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
            {providerInfo?.name}
          </div>
          {models.map((m) => (
            <ModelOption
              key={m.id}
              model={m}
              selected={m.id === byokConfig.model}
              onSelect={() => {
                updateModel(m.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelOption({
  model,
  selected,
  onSelect,
}: {
  model: BYOKModel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${
        selected ? "bg-navy-50 text-navy-700" : "text-gray-700"
      }`}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {model.recommended && <span className="text-amber-500 shrink-0">⭐</span>}
        <span className="truncate font-medium">{model.name}</span>
      </span>
      <span className="text-xs text-gray-400 shrink-0 tabular-nums">
        {formatPrice(model.inputPrice)} / {formatPrice(model.outputPrice)}
      </span>
    </button>
  );
}
