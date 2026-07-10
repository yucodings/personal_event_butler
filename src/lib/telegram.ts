import { supabase } from "./supabase";
import { format, isToday, isTomorrow, isAfter, addDays } from "date-fns";

interface TelegramConfig {
  token: string;
  chatId: string;
}

async function getTelegramConfig(): Promise<TelegramConfig | null> {
  // First try environment variables
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  if (envToken && envChatId) {
    return { token: envToken, chatId: envChatId };
  }

  // Then try database
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
      return {
        token: tokenData.value,
        chatId: chatIdData.value,
      };
    }
  } catch (error) {
    console.error("Error reading Telegram config from database:", error);
  }

  return null;
}

export async function sendTelegramMessage(message: string): Promise<{ success: boolean; error?: string }> {
  const config = await getTelegramConfig();

  if (!config) {
    return { success: false, error: "Telegram not configured. Set bot token and chat ID in Settings." };
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
      return {
        success: false,
        error: `Telegram API error: ${data.description || response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function testTelegramConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await getTelegramConfig();

  if (!config) {
    return { success: false, error: "Telegram not configured. Set bot token and chat ID in Settings." };
  }

  try {
    // First, test the bot token by getting bot info
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${config.token}/getMe`
    );

    if (!botInfoResponse.ok) {
      return { success: false, error: "Invalid bot token. Please check your bot token." };
    }

    const botInfo = await botInfoResponse.json();

    if (!botInfo.ok) {
      return { success: false, error: `Bot token error: ${botInfo.description}` };
    }

    // Then try to send a test message
    const testMessage = `🤖 <b>Test Message</b>\n\nSkyler is connected!\nBot: @${botInfo.result.username}`;
    const sendResult = await sendTelegramMessage(testMessage);

    if (sendResult.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Bot is valid (@${botInfo.result.username}) but cannot send message: ${sendResult.error}. Make sure you've started a chat with the bot.`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function sendDailySummary(): Promise<{ success: boolean; error?: string }> {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const nextWeekStr = format(addDays(today, 7), "yyyy-MM-dd");

  const { data: events, error: dbError } = await supabase
    .from("events")
    .select("*")
    .eq("status", "ongoing")
    .gte("date", todayStr)
    .lte("date", nextWeekStr)
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
