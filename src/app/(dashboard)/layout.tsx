import { Sidebar } from "@/components/dashboard/sidebar";
import { TelegramSchedulerProvider } from "@/components/providers/telegram-scheduler-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TelegramSchedulerProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:ml-64 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </TelegramSchedulerProvider>
  );
}
