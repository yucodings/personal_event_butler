"use client";

import { useState, useEffect, useCallback } from "react";
import { Event, ExtractedEvent } from "@/types";
import { EventCard } from "@/components/dashboard/event-card";
import { EventForm } from "@/components/dashboard/event-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Search, SlidersHorizontal } from "lucide-react";

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedEvent | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: "ongoing",
        sortBy,
        order: "asc",
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
  }, [sortBy, filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleMarkDone = async (event: Event) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });

      if (response.ok) {
        toast.success("Event marked as done");
        fetchEvents();
      }
    } catch {
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async (event: Event) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

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

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setExtractedData(null);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setExtractedData(null);
    setFormOpen(true);
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {filteredEvents.length} ongoing event{filteredEvents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v || "all")}>
            <SelectTrigger className="w-[130px]">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue />
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

          <Select value={sortBy} onValueChange={(v) => setSortBy(v || "date")}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Name</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No ongoing events</p>
          <Button className="mt-4" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add your first event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
              onMarkDone={handleMarkDone}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        onClick={handleAdd}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        extractedData={extractedData}
        onSave={fetchEvents}
      />
    </div>
  );
}
