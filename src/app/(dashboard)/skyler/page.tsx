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
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Scan,
  ChevronLeft,
  ChevronRight,
  Save,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STORAGE_KEY = "skyler-chat-messages";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return [];
}

function saveMessages(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore errors
  }
}

const defaultMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hello! I'm Skyler, your personal butler. I can help you create events by:\n\n• Uploading images (OCR text extraction)\n• Uploading PDF/Word documents\n• Describing events in text\n\nI can extract MULTIPLE events from a single file and let you review each one. How can I help you today?",
    timestamp: new Date().toISOString(),
  },
];

export default function SkylerPage() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrOutput, setOcrOutput] = useState<string>("");

  // Multiple events review state
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [askSubject, setAskSubject] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    }
    setInitialized(true);
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (initialized) {
      saveMessages(messages);
    }
  }, [messages, initialized]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, ocrProgress, reviewMode, extractedEvents, formOpen]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const clearChat = () => {
    setMessages(defaultMessages);
    localStorage.removeItem(STORAGE_KEY);
    setExtractedEvents([]);
    setCurrentEventIndex(0);
    setReviewMode(false);
    setSubjectName("");
    setAskSubject(false);
    setOcrOutput("");
    toast.success("Chat cleared");
  };

  const handleSubjectSubmit = () => {
    if (input.trim().toLowerCase() === "skip") {
      setSubjectName("");
      setAskSubject(false);
      setCurrentEventIndex(0);
      setReviewMode(true);
      addMessage("user", "skip");
      addMessage("assistant", "Continuing without subject name.");
    } else {
      const subject = input.trim();
      setSubjectName(subject);
      setAskSubject(false);
      setCurrentEventIndex(0);
      setReviewMode(true);
      addMessage("user", subject);
      addMessage("assistant", `Subject set to **${subject}**. Events will be prefixed with this subject.`);
    }
    setInput("");
  };

  // Handle event modification via chat
  const handleModifyEvent = (userInput: string) => {
    if (!reviewMode || extractedEvents.length === 0) return false;
    
    const inputLower = userInput.toLowerCase();
    const currentEvent = extractedEvents[currentEventIndex];
    
    // Check for modification commands
    const titleMatch = userInput.match(/(?:change|rename|set|update)\s+(?:title|name)\s+(?:to|as)\s+(.+)/i);
    const dateMatch = userInput.match(/(?:change|set|update|move)\s+(?:date)\s+(?:to|as)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    const timeMatch = userInput.match(/(?:change|set|update)\s+(?:time)\s+(?:to|as)\s+(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)/i);
    const priorityMatch = userInput.match(/(?:change|set|update)\s+(?:priority)\s+(?:to|as)\s+(low|medium|high)/i);
    const typeMatch = userInput.match(/(?:change|set|update)\s+(?:type)\s+(?:to|as)\s+(event|assignment|exam|competition|task)/i);
    
    if (titleMatch) {
      const newTitle = titleMatch[1].trim();
      const updatedEvents = [...extractedEvents];
      updatedEvents[currentEventIndex] = { ...currentEvent, title: newTitle };
      setExtractedEvents(updatedEvents);
      addMessage("user", userInput);
      addMessage("assistant", `✅ Title updated to: **${newTitle}**`);
      setInput("");
      return true;
    }
    
    if (dateMatch) {
      const newDate = dateMatch[1].trim();
      const updatedEvents = [...extractedEvents];
      updatedEvents[currentEventIndex] = { ...currentEvent, date: newDate };
      setExtractedEvents(updatedEvents);
      addMessage("user", userInput);
      addMessage("assistant", `✅ Date updated to: **${newDate}**`);
      setInput("");
      return true;
    }
    
    if (timeMatch) {
      const newTime = timeMatch[1].trim();
      const updatedEvents = [...extractedEvents];
      updatedEvents[currentEventIndex] = { ...currentEvent, time: newTime };
      setExtractedEvents(updatedEvents);
      addMessage("user", userInput);
      addMessage("assistant", `✅ Time updated to: **${newTime}**`);
      setInput("");
      return true;
    }
    
    if (priorityMatch) {
      const newPriority = priorityMatch[1].trim() as "low" | "medium" | "high";
      const updatedEvents = [...extractedEvents];
      updatedEvents[currentEventIndex] = { ...currentEvent, priority: newPriority };
      setExtractedEvents(updatedEvents);
      addMessage("user", userInput);
      addMessage("assistant", `✅ Priority updated to: **${newPriority}**`);
      setInput("");
      return true;
    }
    
    if (typeMatch) {
      const newType = typeMatch[1].trim() as "event" | "assignment" | "exam" | "competition" | "task";
      const updatedEvents = [...extractedEvents];
      updatedEvents[currentEventIndex] = { ...currentEvent, type: newType };
      setExtractedEvents(updatedEvents);
      addMessage("user", userInput);
      addMessage("assistant", `✅ Type updated to: **${newType}**`);
      setInput("");
      return true;
    }
    
    return false;
  };

  // Apply subject name to events
  const applySubjectName = (events: ExtractedEvent[]): ExtractedEvent[] => {
    if (!subjectName) return events;
    return events.map(e => ({
      ...e,
      title: e.title.toLowerCase().includes(subjectName.toLowerCase()) ? e.title : `${subjectName} - ${e.title}`,
    }));
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
        const events = data.events || [];

        if (events.length === 0) {
          addMessage("assistant", "I couldn't find any events in your message. Please try again with more details.");
        } else {
          // Ask for subject name if academic-related keywords detected
          const hasAcademic = events.some((e: ExtractedEvent) => ["assignment", "exam"].includes(e.type));
          const textLower = userMessage.toLowerCase();
          const hasAcademicKeywords = /submit|due|homework|project|midterm|final|lecture|tutorial|lab|assignment|exam|quiz|course|subject|module/i.test(textLower);
          
          if ((hasAcademic || hasAcademicKeywords) && !subjectName) {
            setExtractedEvents(events);
            setAskSubject(true);
            addMessage("assistant", `Found **${events.length} events**. Is this for a specific subject? Type the subject name (or "skip" to continue without):`);
          } else {
            setExtractedEvents(events);
            setCurrentEventIndex(0);
            setReviewMode(true);
            setApiStatus("connected");

            let summary = `Found **${events.length} events**:\n\n`;
            events.forEach((event: ExtractedEvent, i: number) => {
              summary += `${i + 1}. **${event.title}** (${event.type}) - ${event.date}\n`;
            });
            summary += `\nReview each event one by one. Click "Review & Save" to start.`;

            addMessage("assistant", summary);
          }
        }
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

    const isImage = file.type.startsWith("image/");

    addMessage("user", `📎 Uploading: ${file.name}${isImage ? " (will use OCR)" : ""}`);
    setLoading(true);
    setOcrProgress(0);
    setOcrOutput("");

    try {
      let extractedText = "";

      if (isImage) {
        addMessage("assistant", `🔍 Scanning image with OCR... This may take a moment.`);
        extractedText = await extractTextFromImage(file, (progress) => {
          setOcrProgress(progress);
        });

        if (!extractedText.trim()) {
          addMessage("assistant", "Could not extract any text from the image. Please try a clearer image or describe the event in text.");
          setLoading(false);
          return;
        }

        setOcrOutput(extractedText);
        addMessage("assistant", `📄 Extracted text from image. See OCR output below chat.\n\nNow analyzing with AI...`);
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ai/extract", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const events = data.events || [];

          if (events.length === 0) {
            addMessage("assistant", `No events found in "${file.name}". Please try a different file.`);
          } else {
            setExtractedEvents(events);
            setCurrentEventIndex(0);
            setReviewMode(true);
            setApiStatus("connected");

            let summary = `Found **${events.length} events** in "${file.name}":\n\n`;
            events.forEach((event: ExtractedEvent, i: number) => {
              summary += `${i + 1}. **${event.title}** (${event.type}) - ${event.date}\n`;
            });
            summary += `\nReview each event one by one. Click "Review & Save" to start.`;

            addMessage("assistant", summary);
          }
          setLoading(false);
          return;
        } else {
          const error = await response.json();
          addMessage("assistant", `Failed to extract from file: ${error.error}`);
          setLoading(false);
          return;
        }
      }

      // For images - send extracted text to MiMo
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];

        if (events.length === 0) {
          addMessage("assistant", "No events found in the extracted text. Please try a different image.");
        } else {
          setExtractedEvents(events);
          setCurrentEventIndex(0);
          setReviewMode(true);
          setApiStatus("connected");

          let summary = `Found **${events.length} events**:\n\n`;
          events.forEach((event: ExtractedEvent, i: number) => {
            summary += `${i + 1}. **${event.title}** (${event.type}) - ${event.date}\n`;
          });
          summary += `\nReview each event one by one. Click "Review & Save" to start.`;

          addMessage("assistant", summary);
        }
      } else {
        const error = await response.json();
        setApiStatus("error");
        addMessage("assistant", `Failed to analyze text: ${error.error}`);
      }
    } catch (error) {
      setApiStatus("error");
      addMessage("assistant", `Failed to process the file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
      setOcrProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReviewEvent = () => {
    setFormOpen(true);
  };

  const handleSaveCurrentEvent = async () => {
    if (extractedEvents.length === 0) return;

    const currentEvent = extractedEvents[currentEventIndex];
    const eventToSave = subjectName && !currentEvent.title.toLowerCase().includes(subjectName.toLowerCase())
      ? { ...currentEvent, title: `${subjectName} - ${currentEvent.title}` }
      : currentEvent;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventToSave,
          status: "ongoing",
        }),
      });

      if (response.ok) {
        toast.success(`Event "${currentEvent.title}" saved!`);

        if (currentEventIndex < extractedEvents.length - 1) {
          // Move to next event
          setCurrentEventIndex(currentEventIndex + 1);
          setFormOpen(true);
          addMessage("assistant", `✅ Saved "${currentEvent.title}". Now reviewing event ${currentEventIndex + 2} of ${extractedEvents.length}.`);
        } else {
          // All events saved
          setExtractedEvents([]);
          setCurrentEventIndex(0);
          setReviewMode(false);
          setFormOpen(false);
          addMessage("assistant", `✅ All ${extractedEvents.length} events have been saved! You can find them on your dashboard.`);
        }
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    }
  };

  const handleSkipEvent = () => {
    if (currentEventIndex < extractedEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1);
      setFormOpen(true);
      addMessage("assistant", `⏭️ Skipped "${extractedEvents[currentEventIndex].title}". Now reviewing event ${currentEventIndex + 2} of ${extractedEvents.length}.`);
    } else {
      setExtractedEvents([]);
      setCurrentEventIndex(0);
      setReviewMode(false);
      setFormOpen(false);
      addMessage("assistant", `Review complete. Remaining events have been skipped.`);
    }
  };

  const handleSaveAllEvents = async () => {
    setLoading(true);
    let savedCount = 0;

    for (const event of extractedEvents) {
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...event,
            status: "ongoing",
          }),
        });

        if (response.ok) {
          savedCount++;
        }
      } catch {
        // Continue with next event
      }
    }

    setLoading(false);
    setExtractedEvents([]);
    setCurrentEventIndex(0);
    setReviewMode(false);

    addMessage("assistant", `✅ Saved ${savedCount} of ${extractedEvents.length} events to your dashboard!`);
    toast.success(`Saved ${savedCount} events!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skyler AI</h1>
          <p className="text-muted-foreground">Upload images, files, or describe events</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
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

              {ocrOutput && (
                <div className="mb-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">OCR Output</span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs" 
                        onClick={() => {
                          navigator.clipboard.writeText(ocrOutput);
                          toast.success("OCR text copied!");
                        }}
                      >
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setOcrOutput("")}>
                        Hide
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                    {ocrOutput}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    askSubject 
                      ? "Enter subject name or 'skip'..." 
                      : reviewMode 
                      ? "Type 'change title to X', 'change date to YYYY-MM-DD', etc."
                      : "Describe an event..."
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      if (askSubject) {
                        handleSubjectSubmit();
                      } else if (reviewMode && input.trim()) {
                        handleModifyEvent(input);
                      } else {
                        handleExtractFromText();
                      }
                    }
                  }}
                  disabled={loading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || askSubject || reviewMode}
                  title="Upload file"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    if (askSubject) {
                      handleSubjectSubmit();
                    } else if (reviewMode && input.trim()) {
                      handleModifyEvent(input);
                    } else {
                      handleExtractFromText();
                    }
                  }}
                  disabled={loading || (!askSubject && !reviewMode && !input.trim())}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {reviewMode && extractedEvents.length > 0 && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center justify-between">
                  <span>Reviewing Events</span>
                  <Badge>{currentEventIndex + 1} of {extractedEvents.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {extractedEvents.map((event, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        index === currentEventIndex
                          ? "border-primary bg-primary/5"
                          : index < currentEventIndex
                          ? "border-green-200 bg-green-50 opacity-60"
                          : "border-muted"
                      )}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {event.type} • {event.date} • {event.priority}
                      </div>
                      {index < currentEventIndex && (
                        <div className="text-xs text-green-600 mt-1">✓ Saved</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleReviewEvent} className="flex-1">
                    <Save className="w-3 h-3 mr-1" />
                    Edit & Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSkipEvent} className="flex-1">
                    <SkipForward className="w-3 h-3 mr-1" />
                    Skip
                  </Button>
                </div>
                {extractedEvents.length > 1 && (
                  <Button size="sm" variant="secondary" className="w-full mt-2" onClick={handleSaveAllEvents} disabled={loading}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Save All ({extractedEvents.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Supported Files</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Images (PNG, JPG) - OCR
                </div>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Upload screenshots of schedules</li>
                <li>• Take photos of event posters</li>
                <li>• OCR extracts text from images</li>
                <li>• AI finds ALL events in the text</li>
                <li>• Review each event one by one</li>
                <li>• Or save all at once</li>
                {reviewMode && (
                  <>
                    <li className="font-medium text-foreground mt-2">Modify during review:</li>
                    <li>• "change title to X"</li>
                    <li>• "change date to 2026-07-15"</li>
                    <li>• "change time to 14:00"</li>
                    <li>• "change priority to high"</li>
                    <li>• "change type to exam"</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        extractedData={extractedEvents[currentEventIndex] || null}
        showSkip={reviewMode && extractedEvents.length > 1}
        currentEventIndex={currentEventIndex}
        totalEvents={extractedEvents.length}
        onSave={handleSaveCurrentEvent}
        onSkip={handleSkipEvent}
      />
    </div>
  );
}
