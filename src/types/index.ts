export type EventType = "event" | "assignment" | "exam" | "competition" | "task";
export type EventPriority = "low" | "medium" | "high";
export type EventStatus = "ongoing" | "done";
export type CalendarView = "daily" | "weekly" | "monthly";
export type DocumentType = "image" | "pdf" | "doc" | "txt";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  date: string;
  time: string | null;
  priority: EventPriority;
  status: EventStatus;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  color: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

export interface ExtractedEvent {
  title: string;
  type: EventType;
  date: string;
  time: string | null;
  priority: EventPriority;
  description: string | null;
}

export interface Document {
  id: string;
  file_name: string;
  file_type: DocumentType;
  ocr_text: string | null;
  processed_text: string | null;
  events_count: number;
  created_at: string;
}

export interface DocumentDetail extends Document {
  events: Event[];
}

export interface AIResponse {
  reply: string;
  action?: {
    type: "create_event" | "modify_event" | "query_result";
    data: any;
  };
}
