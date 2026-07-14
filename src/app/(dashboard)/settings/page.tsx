"use client";

import { Suspense } from "react";
import SettingsPageContent from "./settings-content";

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
