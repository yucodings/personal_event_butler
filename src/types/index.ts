export type EventType = "event" | "assignment" | "exam" | "competition" | "task";
export type EventPriority = "low" | "medium" | "high";
export type EventStatus = "ongoing" | "done";
export type CalendarView = "daily" | "weekly" | "monthly";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  date: string;
  time: string | null;
  priority: EventPriority;
  status: EventStatus;
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
