import { supabase } from "./supabase";
import { format, isToday, isTomorrow, isAfter, addDays, differenceInDays } from "date-fns";

interface TelegramConfig {
  token: string;
  chatId: string;
}

async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  if (envToken && envChatId) {
    return { token: envToken, chatId: envChatId };
  }

  try {
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

    if (tokenData?.value && chatIdData?.value) {
      return { token: tokenData.value, chatId: chatIdData.value };
    }
  } catch {}

  return null;
}

export async function sendTelegramMessage(message: string): Promise<{ success: boolean; error?: string }> {
  const config = await getTelegramConfig();

  if (!config) {
    return { success: false, error: "Telegram not configured." };
  }

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

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: `Telegram API error: ${data.description}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : "Unknown"}` };
  }
}

export async function testTelegramConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await getTelegramConfig();

  if (!config) {
    return { success: false, error: "Telegram not configured." };
  }

  try {
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${config.token}/getMe`);
    if (!botInfoResponse.ok) {
      return { success: false, error: "Invalid bot token." };
    }

    const botInfo = await botInfoResponse.json();
    if (!botInfo.ok) {
      return { success: false, error: `Bot error: ${botInfo.description}` };
    }

    const testMessage = `🤖 <b>Test Message</b>\n\nSkyler is connected!\nBot: @${botInfo.result.username}`;
    const sendResult = await sendTelegramMessage(testMessage);

    if (sendResult.success) {
      return { success: true };
    } else {
      return { success: false, error: `Bot valid but cannot send: ${sendResult.error}` };
    }
  } catch (error) {
    return { success: false, error: `Connection error: ${error instanceof Error ? error.message : "Unknown"}` };
  }
}

export async function sendDailySummary(): Promise<{ success: boolean; error?: string }> {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const threeWeeksStr = format(addDays(today, 21), "yyyy-MM-dd");

  const { data: events, error: dbError } = await supabase
    .from("events")
    .select("*")
    .eq("status", "ongoing")
    .gte("date", todayStr)
    .lte("date", threeWeeksStr)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (dbError) {
    return { success: false, error: `Database error: ${dbError.message}` };
  }

  if (!events || events.length === 0) {
    return sendTelegramMessage(
      `📋 <b>Daily Summary - ${format(today, "MMMM d, yyyy")}</b>\n\n✅ No upcoming events. Enjoy your day!`
    );
  }

  const todayEvents = events.filter((e) => isToday(new Date(e.date)));
  const tomorrowEvents = events.filter((e) => isTomorrow(new Date(e.date)));
  const upcomingEvents = events.filter(
    (e) => !isToday(new Date(e.date)) && !isTomorrow(new Date(e.date)) && isAfter(new Date(e.date), today)
  );

  let message = `📋 <b>Daily Summary - ${format(today, "MMMM d, yyyy")}</b>\n`;

  // TODAY section
  if (todayEvents.length > 0) {
    message += `\n🔴 <b>TODAY (${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""}):</b>\n`;
    todayEvents.forEach((e) => {
      const time = e.time ? ` @ ${e.time}` : "";
      const icon = getTypeIcon(e.type);
      message += `${icon} ${e.title}${time} (${e.priority.toUpperCase()})\n`;
    });
  } else {
    message += `\n🔴 <b>TODAY:</b>\n✅ No events today\n`;
  }

  // TOMORROW section
  if (tomorrowEvents.length > 0) {
    message += `\n🟡 <b>TOMORROW (${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? "s" : ""}):</b>\n`;
    tomorrowEvents.forEach((e) => {
      const time = e.time ? ` @ ${e.time}` : "";
      const icon = getTypeIcon(e.type);
      message += `${icon} ${e.title}${time} (${e.priority.toUpperCase()})\n`;
    });
  }

  // UPCOMING section with days until deadline
  if (upcomingEvents.length > 0) {
    message += `\n📌 <b>UPCOMING (${upcomingEvents.length} event${upcomingEvents.length > 1 ? "s" : ""}):</b>\n`;
    upcomingEvents.slice(0, 10).forEach((e) => {
      const icon = getTypeIcon(e.type);
      const daysUntil = differenceInDays(new Date(e.date), today);
      const daysText = daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
      const dueText = e.priority === "high" ? " ⚠️ DUE" : "";
      message += `${icon} ${e.title} - ${format(new Date(e.date), "MMM d")} (${daysText})${dueText}\n`;
    });
    if (upcomingEvents.length > 10) {
      message += `... and ${upcomingEvents.length - 10} more\n`;
    }
  }

  // ADVICE section
  const highPriorityToday = todayEvents.filter((e) => e.priority === "high");
  const highPriorityTomorrow = tomorrowEvents.filter((e) => e.priority === "high");

  if (highPriorityToday.length > 0) {
    message += `\n💡 <b>Advice:</b>\n`;
    message += `• You have ${highPriorityToday.length} high priority task${highPriorityToday.length > 1 ? "s" : ""} today - focus on these first!\n`;
  } else if (highPriorityTomorrow.length > 0) {
    message += `\n💡 <b>Advice:</b>\n`;
    message += `• Prepare for ${highPriorityTomorrow.length} high priority task${highPriorityTomorrow.length > 1 ? "s" : ""} tomorrow\n`;
  } else if (todayEvents.length > 0) {
    message += `\n💡 <b>Advice:</b>\n`;
    message += `• Start with the earliest deadline today\n`;
  } else if (tomorrowEvents.length > 0) {
    message += `\n💡 <b>Advice:</b>\n`;
    message += `• No events today - prepare for tomorrow\n`;
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
