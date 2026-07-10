"use client";

import { useState, useEffect, useCallback } from "react";
import { Event } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDays,
  FileText,
  BookOpen,
  Trophy,
  CheckSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof CalendarDays> = {
  event: CalendarDays,
  assignment: FileText,
  exam: BookOpen,
  competition: Trophy,
  task: CheckSquare,
};

const typeLabels: Record<string, string> = {
  event: "Event",
  assignment: "Assignment",
  exam: "Exam",
  competition: "Competition",
  task: "Task",
};

export default function HistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: "done",
        sortBy: "date",
        order: "desc",
      });
      if (filterType !== "all") {
        params.set("type", filterType);
      }

      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch {
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRestore = async (event: Event) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ongoing" }),
      });

      if (response.ok) {
        toast.success("Event restored");
        fetchEvents();
      }
    } catch {
      toast.error("Failed to restore event");
    }
  };

  const handleDelete = async (event: Event) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Event deleted");
        fetchEvents();
      }
    } catch {
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Past Events</h1>
          <p className="text-muted-foreground">
            {events.length} completed event{events.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v || "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="event">Events</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="exam">Exams</SelectItem>
            <SelectItem value="competition">Competitions</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No completed events yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = typeIcons[event.type] || CalendarDays;
            return (
              <Card key={event.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      "bg-green-100 dark:bg-green-900/30"
                    )}>
                      <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{event.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[event.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "MMM d, yyyy")}
                          {event.time && ` at ${event.time}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(event)}
                        title="Restore to ongoing"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(event)}
                        className="text-destructive hover:text-destructive"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
