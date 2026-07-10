import { supabase } from "./supabase";
import { Event } from "@/types";
import { format, isToday, isTomorrow, isAfter, addDays } from "date-fns";

async function getTelegramConfig(): Promise<{ token: string; chatId: string } | null> {
  const { data: tokenData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "telegram_bot_token")
    .single();

  const { data: chatIdData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "telegram_chat_id")
    .single();

  if (!tokenData?.value || !chatIdData?.value) return null;

  return {
    token: tokenData.value,
    chatId: chatIdData.value,
  };
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  const config = await getTelegramConfig();
  if (!config) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function sendDailySummary(): Promise<boolean> {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const nextWeekStr = format(addDays(today, 7), "yyyy-MM-dd");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "ongoing")
    .gte("date", todayStr)
    .lte("date", nextWeekStr)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (!events || events.length === 0) {
    return sendTelegramMessage(`📋 <b>Daily Summary - ${format(today, "MMMM d, yyyy")}</b>\n\n✅ No upcoming events. Enjoy your day!`);
  }

  const todayEvents = events.filter((e) => isToday(new Date(e.date)));
  const tomorrowEvents = events.filter((e) => isTomorrow(new Date(e.date)));
  const upcomingEvents = events.filter(
    (e) => !isToday(new Date(e.date)) && !isTomorrow(new Date(e.date)) && isAfter(new Date(e.date), today)
  );
  const importantEvents = events.filter((e) => e.priority === "high");

  let message = `📋 <b>Daily Summary - ${format(today, "MMMM d, yyyy")}</b>\n`;

  if (todayEvents.length > 0) {
    message += `\n🔴 <b>TODAY:</b>\n`;
    todayEvents.forEach((e) => {
      const time = e.time ? ` @ ${e.time}` : "";
      const icon = getTypeIcon(e.type);
      message += `${icon} ${e.title}${time} (${e.priority.toUpperCase()})\n`;
    });
  }

  if (tomorrowEvents.length > 0) {
    message += `\n🟡 <b>TOMORROW:</b>\n`;
    tomorrowEvents.forEach((e) => {
      const time = e.time ? ` @ ${e.time}` : "";
      const icon = getTypeIcon(e.type);
      message += `${icon} ${e.title}${time} (${e.priority.toUpperCase()})\n`;
    });
  }

  if (upcomingEvents.length > 0) {
    message += `\n📌 <b>UPCOMING:</b>\n`;
    upcomingEvents.slice(0, 5).forEach((e) => {
      const icon = getTypeIcon(e.type);
      message += `${icon} ${e.title} - ${format(new Date(e.date), "MMM d")}\n`;
    });
    if (upcomingEvents.length > 5) {
      message += `... and ${upcomingEvents.length - 5} more\n`;
    }
  }

  if (importantEvents.length > 0) {
    message += `\n⚠️ <b>IMPORTANT TASKS:</b>\n`;
    importantEvents.forEach((e) => {
      const icon = getTypeIcon(e.type);
      const dueDate = isToday(new Date(e.date)) ? "today" : format(new Date(e.date), "MMM d");
      message += `${icon} ${e.title} (due ${dueDate})\n`;
    });
  }

  return sendTelegramMessage(message);
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "event": return "📅";
    case "assignment": return "📝";
    case "exam": return "📖";
    case "competition": return "🏆";
    case "task": return "✅";
    default: return "•";
  }
}

export async function isTelegramConfigured(): Promise<boolean> {
  const config = await getTelegramConfig();
  return config !== null;
}
