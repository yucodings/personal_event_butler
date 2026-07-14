"use client";

import { useTelegramScheduler } from "@/hooks/use-telegram-scheduler";

export function TelegramSchedulerProvider({ children }: { children: React.ReactNode }) {
  useTelegramScheduler();
  return <>{children}</>;
}
