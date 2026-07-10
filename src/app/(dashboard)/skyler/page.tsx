"use client";

import { useState, useRef } from "react";
import { ExtractedEvent } from "@/types";
import { EventForm } from "@/components/dashboard/event-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Upload,
  FileText,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function SkylerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Skyler, your personal butler. I can help you create events by uploading files (images, PDFs, documents) or describing them in text. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleExtractFromText = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    addMessage("user", userMessage);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedData(data);
        setApiStatus("connected");
        addMessage(
          "assistant",
          `I found the following event details:\n\n` +
          `**Title:** ${data.title}\n` +
          `**Type:** ${data.type}\n` +
          `**Date:** ${data.date}\n` +
          `**Time:** ${data.time || "Not specified"}\n` +
          `**Priority:** ${data.priority}\n` +
          `**Description:** ${data.description || "None"}\n\n` +
          `Would you like to save this event? Click the button below to review and edit.`
        );
      } else {
        const error = await response.json();
        setApiStatus("error");
        addMessage("assistant", `Sorry, I couldn't process that: ${error.error}`);
      }
    } catch {
      setApiStatus("error");
      addMessage("assistant", "Sorry, something went wrong. Please check your MiMo API key configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addMessage("user", `📎 Uploading: ${file.name}`);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/extract", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedData(data);
        setApiStatus("connected");
        addMessage(
          "assistant",
          `I extracted the following from "${file.name}":\n\n` +
          `**Title:** ${data.title}\n` +
          `**Type:** ${data.type}\n` +
          `**Date:** ${data.date}\n` +
          `**Time:** ${data.time || "Not specified"}\n` +
          `**Priority:** ${data.priority}\n` +
          `**Description:** ${data.description || "None"}\n\n` +
          `Click the button below to review and save this event.`
        );
      } else {
        const error = await response.json();
        setApiStatus("error");
        addMessage("assistant", `Failed to extract from file: ${error.error}`);
      }
    } catch {
      setApiStatus("error");
      addMessage("assistant", "Failed to process the file. Please check your connection.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveEvent = async () => {
    if (!extractedData) return;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extractedData,
          status: "ongoing",
        }),
      });

      if (response.ok) {
        toast.success("Event saved successfully");
        addMessage("assistant", "Event saved! You can find it on your dashboard.");
        setExtractedData(null);
        setFormOpen(false);
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skyler AI</h1>
          <p className="text-muted-foreground">Upload files or describe events to create them</p>
        </div>
        <Badge
          variant={apiStatus === "connected" ? "default" : apiStatus === "error" ? "destructive" : "secondary"}
          className="gap-1"
        >
          {apiStatus === "connected" ? (
            <><CheckCircle className="w-3 h-3" /> MiMo Connected</>
          ) : apiStatus === "error" ? (
            <><XCircle className="w-3 h-3" /> API Error</>
          ) : (
            <><Bot className="w-3 h-3" /> Ready</>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col h-[600px]">
          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
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
                      <div className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}

                {extractedData && !formOpen && (
                  <div className="flex justify-center">
                    <Button onClick={() => setFormOpen(true)}>
                      Review & Save Event
                    </Button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe an event..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleExtractFromText()}
                  disabled={loading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleExtractFromText}
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Supported Files</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF Documents
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Word Documents (DOC, DOCX)
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Text Files (TXT)
                </div>
                <p className="text-xs mt-2">Note: Images are not supported. Please describe image content in text.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Upload PDF or Word documents</li>
                <li>• Describe events in natural language</li>
                <li>• Include date and time for best results</li>
                <li>• Review extracted data before saving</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        extractedData={extractedData}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
