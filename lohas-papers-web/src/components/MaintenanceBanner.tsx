"use client";

/**
 * Maintenance banner — controlled by NEXT_PUBLIC_MAINTENANCE_MESSAGE env var.
 * Set the env var in Vercel dashboard to show the banner.
 * Remove (or leave empty) to hide it. No redeploy needed if using Vercel edge config,
 * but for env vars a redeploy is required.
 */
export default function MaintenanceBanner() {
  const message = process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE;
  if (!message) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-2 text-sm text-amber-800">
        <span className="text-base">⚠️</span>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
