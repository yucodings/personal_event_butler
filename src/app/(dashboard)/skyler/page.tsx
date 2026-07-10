"use client";

import { useState, useRef, useEffect } from "react";
import { ExtractedEvent } from "@/types";
import { EventForm } from "@/components/dashboard/event-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { extractTextFromImage } from "@/lib/ocr";
import {
  Bot,
  Send,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Clock,
  Scan,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "create_event" | "modify_event";
    data: any;
  };
  timestamp: string;
}

const STORAGE_KEY = "skyler-chat-messages";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveMessages(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

const defaultMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hello! I'm Skyler, your personal butler. I can help you:\n\n• Query your events and schedule\n• Create new events\n• Modify existing events\n• Upload files (images, PDF, docs) for analysis\n• Answer questions about your uploaded documents\n• Give advice about your deadlines\n\nHow can I help you today?",
    timestamp: new Date().toISOString(),
  },
];

export default function SkylerPage() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedEvent | null>(null);
  const [modifyEventId, setModifyEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) setMessages(stored);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) saveMessages(messages);
  }, [messages, initialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, ocrProgress]);

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const clearChat = () => {
    setMessages(defaultMessages);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    addMessage({ role: "user", content: `📎 Uploading: ${file.name}` });
    setLoading(true);
    setOcrProgress(0);

    try {
      let extractedText = "";

      if (isImage) {
        addMessage({ role: "assistant", content: "🔍 Scanning image with OCR..." });
        extractedText = await extractTextFromImage(file, (progress) => {
          setOcrProgress(progress);
        });

        if (!extractedText.trim()) {
          addMessage({ role: "assistant", content: "Could not extract text from the image. Please try a clearer image." });
          setLoading(false);
          return;
        }
        addMessage({ role: "assistant", content: `📄 OCR Output:\n\n${extractedText}\n\n---\nAnalyzing content...` });
      } else {
        // Upload to Documents API for processing
        const formData = new FormData();
        formData.append("files", file);

        const uploadResponse = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const results = await uploadResponse.json();
          if (results.length > 0 && results[0].document) {
            extractedText = results[0].document.ocr_text || results[0].document.processed_text || "";
            addMessage({ role: "assistant", content: `📄 File processed and saved to Documents.\n\nAnalyzing content...` });
          }
        } else {
          addMessage({ role: "assistant", content: "Failed to process file. Please try again." });
          setLoading(false);
          return;
        }
      }

      // Send extracted text to AI for analysis
      if (extractedText) {
        const chatResponse = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Analyze this content and extract any events, deadlines, or important dates:\n\n${extractedText}`,
            conversation_history: messages.slice(-5),
          }),
        });

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          addMessage({
            role: "assistant",
            content: data.reply,
            action: data.action,
          });

          if (data.action) {
            if (data.action.type === "create_event") {
              setExtractedData(data.action.data);
              setModifyEventId(null);
            }
          }
        }
      }
    } catch (error) {
      addMessage({ role: "assistant", content: "Failed to process file. Please try again." });
    } finally {
      setLoading(false);
      setOcrProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    addMessage({ role: "user", content: userMessage });
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: messages.slice(-10),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addMessage({
          role: "assistant",
          content: data.reply,
          action: data.action,
        });

        if (data.action) {
          if (data.action.type === "create_event") {
            setExtractedData(data.action.data);
            setModifyEventId(null);
          } else if (data.action.type === "modify_event") {
            setExtractedData(data.action.data);
            setModifyEventId(data.action.data.id);
          }
        }
      } else {
        addMessage({
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
        });
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, something went wrong. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!extractedData) return;

    try {
      let response;

      if (modifyEventId) {
        response = await fetch(`/api/events/${modifyEventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extractedData),
        });
      } else {
        response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...extractedData, status: "ongoing" }),
        });
      }

      if (response.ok) {
        toast.success(modifyEventId ? "Event updated!" : "Event created!");
        addMessage({
          role: "assistant",
          content: modifyEventId
            ? `✅ Event "${extractedData.title}" has been updated.`
            : `✅ Event "${extractedData.title}" has been created.`,
        });
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    } finally {
      setExtractedData(null);
      setModifyEventId(null);
    }
  };

  const handleCancelAction = () => {
    setExtractedData(null);
    setModifyEventId(null);
    addMessage({
      role: "assistant",
      content: "Action cancelled.",
    });
  };

  const renderActionCard = (action: Message["action"]) => {
    if (!action) return null;

    const data = action.data;
    const isModify = action.type === "modify_event";

    return (
      <Card className="mt-3 border-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {isModify ? "Modify Event" : "Create Event"}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.title}</span>
              <Badge variant="outline">{data.type}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {data.date}
              {data.time && (
                <>
                  <Clock className="w-3 h-3 ml-2" />
                  {data.time}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  data.priority === "high"
                    ? "bg-red-100 text-red-800"
                    : data.priority === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
                )}
              >
                {data.priority}
              </Badge>
            </div>
            {data.description && (
              <p className="text-muted-foreground">{data.description}</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => {
                setExtractedData(data);
                setModifyEventId(isModify ? data.id : null);
                setFormOpen(true);
              }}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {isModify ? "Confirm Change" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelAction}>
              <XCircle className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skyler AI</h1>
          <p className="text-muted-foreground">Your personal assistant for events and documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col h-[600px]">
        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-visible" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.action && renderActionCard(msg.action)}
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  {ocrProgress > 0 ? (
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">OCR: {ocrProgress}%</span>
                    </div>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your events, documents, or schedule..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Upload file"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        extractedData={extractedData}
        onSave={handleConfirmAction}
      />
    </div>
  );
}
