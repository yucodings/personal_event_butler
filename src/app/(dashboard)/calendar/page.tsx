"use client";

import { useState, useEffect, useCallback } from "react";
import { Event, Period, CalendarView } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EventForm } from "@/components/dashboard/event-form";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

const viewIcons: Record<CalendarView, typeof CalendarDays> = {
  daily: CalendarDays,
  weekly: CalendarRange,
  monthly: CalendarIcon,
};

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ name: "", start_date: "", end_date: "", color: "#3b82f6" });

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, periodsRes] = await Promise.all([
        fetch("/api/events?status=ongoing"),
        fetch("/api/periods"),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (periodsRes.ok) setPeriods(await periodsRes.json());
    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDateRange = () => {
    switch (view) {
      case "daily":
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case "weekly":
        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
      case "monthly":
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const navigate = (direction: "prev" | "next") => {
    const fn = direction === "next" ? addDays : subDays;
    const fnWeek = direction === "next" ? addWeeks : subWeeks;
    const fnMonth = direction === "next" ? addMonths : subMonths;

    switch (view) {
      case "daily":
        setCurrentDate(fn(currentDate, 1));
        break;
      case "weekly":
        setCurrentDate(fnWeek(currentDate, 1));
        break;
      case "monthly":
        setCurrentDate(fnMonth(currentDate, 1));
        break;
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), date));
  };

  const getPeriodsForDate = (date: Date) => {
    return periods.filter((p) =>
      isWithinInterval(date, {
        start: new Date(p.start_date),
        end: new Date(p.end_date),
      })
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormOpen(true);
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.name || !newPeriod.start_date || !newPeriod.end_date) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPeriod),
      });

      if (response.ok) {
        toast.success("Period created");
        setPeriodDialogOpen(false);
        setNewPeriod({ name: "", start_date: "", end_date: "", color: "#3b82f6" });
        fetchData();
      }
    } catch {
      toast.error("Failed to create period");
    }
  };

  const renderDailyView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const dayPeriods = getPeriodsForDate(currentDate);

    return (
      <div className="space-y-4">
        {dayPeriods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dayPeriods.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}

        <div className="border rounded-lg p-4 min-h-[400px]">
          <h3 className="font-medium mb-4">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
          {dayEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border-l-4",
                    event.priority === "high" ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" :
                    event.priority === "medium" ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                    "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.title}</span>
                    {event.time && (
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        {renderPeriodBands(weekStart, weekEnd)}

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border rounded-lg p-2 min-h-[120px] cursor-pointer hover:bg-muted/50 transition-colors",
                  isCurrentDay && "border-primary bg-primary/5"
                )}
                onClick={() => handleDateClick(day)}
              >
                <div className={cn(
                  "text-sm font-medium mb-2",
                  isCurrentDay && "text-primary"
                )}>
                  {format(day, "EEE d")}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1 rounded truncate",
                        event.type === "exam" ? "bg-red-100 text-red-800 dark:bg-red-900/30" :
                        event.type === "competition" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30"
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="space-y-4">
        {renderPeriodBands(monthStart, monthEnd)}

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentDay = isToday(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border rounded-lg p-1 min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors",
                  isCurrentDay && "border-primary bg-primary/5",
                  !isCurrentMonth && "opacity-50"
                )}
                onClick={() => handleDateClick(day)}
              >
                <div className={cn(
                  "text-xs font-medium mb-1",
                  isCurrentDay && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-[10px] p-0.5 rounded truncate",
                        event.type === "exam" ? "bg-red-100 text-red-800 dark:bg-red-900/30" :
                        event.type === "competition" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30"
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPeriodBands = (rangeStart: Date, rangeEnd: Date) => {
    const visiblePeriods = periods.filter((p) => {
      const pStart = new Date(p.start_date);
      const pEnd = new Date(p.end_date);
      return pStart <= rangeEnd && pEnd >= rangeStart;
    });

    if (visiblePeriods.length === 0) return null;

    return (
      <div className="space-y-1">
        {visiblePeriods.map((period) => (
          <div
            key={period.id}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white"
            style={{ backgroundColor: period.color }}
          >
            {period.name} ({format(new Date(period.start_date), "MMM d")} - {format(new Date(period.end_date), "MMM d")})
          </div>
        ))}
      </div>
    );
  };

  const ViewIcon = viewIcons[view];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            {format(currentDate, view === "monthly" ? "MMMM yyyy" : view === "weekly" ? "'Week of' MMM d, yyyy" : "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Select value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <SelectTrigger className="w-[120px]">
              <ViewIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => setPeriodDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Period
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
      ) : view === "daily" ? (
        renderDailyView()
      ) : view === "weekly" ? (
        renderWeeklyView()
      ) : (
        renderMonthlyView()
      )}

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        extractedData={null}
        onSave={fetchData}
      />

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Week 1, Semester A"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newPeriod.start_date}
                  onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newPeriod.end_date}
                  onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={newPeriod.color}
                  onChange={(e) => setNewPeriod({ ...newPeriod, color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{newPeriod.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
