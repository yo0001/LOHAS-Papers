"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { initPostHog, identifyUser, resetUser } from "@/lib/posthog";

export default function PostHogProvider() {
  const { user } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (user) {
      identifyUser(user.id, user.email ?? undefined);
    } else {
      resetUser();
    }
  }, [user]);

  return null;
}
