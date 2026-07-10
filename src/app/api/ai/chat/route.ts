import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractEventsFromText, isApiKeyConfigured } from "@/lib/mimo";
import { format } from "date-fns";

const SYSTEM_PROMPT = `You are Skyler, a personal butler assistant. You manage events, deadlines, and documents.

CAPABILITIES:
1. QUERY events - Answer questions about schedule, deadlines, exams
2. CREATE events - When user describes an event, return a JSON action with type "create_event"
3. MODIFY events - When user wants to change an event, return a JSON action with type "modify_event"
4. QUERY documents - Search uploaded files by keywords, return summary + bullet points
5. GIVE ADVICE - After each response, add helpful advice (neutral tone)

RESPONSE FORMAT:
Always respond with a JSON object:
{
  "reply": "Your text response here",
  "action": null or {
    "type": "create_event" | "modify_event",
    "data": { event details }
  }
}

RULES:
- For event queries: Search database, list events clearly, add advice
- For document queries: Search documents table by keywords, return processed content
- For create events: Include action with event data (title, type, date, time, priority, description)
- For modify events: Include action with event_id and changes
- Be neutral and helpful
- Today's date is provided in the user message`;

async function queryEvents(dateRange?: { start: string; end: string }) {
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "ongoing")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;
  return data || [];
}

async function searchDocuments(keywords: string[]) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  // Filter by keywords in file_name or ocr_text
  const results = (data || []).filter((doc) => {
    const searchText = `${doc.file_name} ${doc.ocr_text || ""}`.toLowerCase();
    return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
  });

  return results;
}

async function findEventByName(name: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "ongoing")
    .ilike("title", `%${name}%`)
    .limit(5);

  if (error) throw error;
  return data || [];
}

export async function POST(request: NextRequest) {
  try {
    if (!isApiKeyConfigured()) {
      return NextResponse.json({ error: "MiMo API not configured" }, { status: 400 });
    }

    const body = await request.json();
    const { message, conversation_history } = body;

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    // Get current date info
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const dayOfWeek = format(today, "EEEE");

    // Get upcoming events for context
    const upcomingEvents = await queryEvents({
      start: todayStr,
      end: format(new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    });

    // Build context
    let context = `\n\nCONTEXT:\nToday is ${dayOfWeek}, ${todayStr}.\n\nUpcoming events (next 3 weeks):\n`;
    if (upcomingEvents.length > 0) {
      upcomingEvents.forEach((e) => {
        context += `- ${e.title} (${e.type}) on ${e.date}${e.time ? ` at ${e.time}` : ""} [${e.priority}]\n`;
      });
    } else {
      context += "No upcoming events.\n";
    }

    // Check if user is asking about documents
    const docKeywords = message.match(/(?:uploaded|document|file|pdf|image|schedule|notice)/gi);
    if (docKeywords) {
      const docs = await searchDocuments(docKeywords);
      if (docs.length > 0) {
        context += "\nRelevant documents:\n";
        docs.forEach((d) => {
          context += `- ${d.file_name} (${d.file_type}, uploaded ${format(new Date(d.created_at), "MMM d")})\n`;
          if (d.processed_text) {
            context += `  Summary: ${d.processed_text.substring(0, 200)}...\n`;
          }
        });
      }
    }

    // Build messages for MiMo
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + context },
      ...(conversation_history || []).slice(-10), // Keep last 10 messages
      { role: "user", content: message },
    ];

    // Call MiMo API
    const apiKey = process.env.MIMO_API_KEY || "";
    const baseUrl = apiKey.startsWith("tp-")
      ? "https://token-plan-sgp.xiaomimimo.com/v1"
      : "https://api.xiaomimimo.com/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("MiMo API error:", errorText);
      return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    // Try to parse JSON response
    let aiResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        aiResponse = { reply: content, action: null };
      }
    } catch {
      aiResponse = { reply: content, action: null };
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ error: "Chat processing failed" }, { status: 500 });
  }
}
