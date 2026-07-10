"use client";

import { Event, EventType, EventPriority } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  FileText,
  BookOpen,
  Trophy,
  CheckSquare,
  Clock,
  MoreVertical,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<EventType, typeof CalendarDays> = {
  event: CalendarDays,
  assignment: FileText,
  exam: BookOpen,
  competition: Trophy,
  task: CheckSquare,
};

const typeLabels: Record<EventType, string> = {
  event: "Event",
  assignment: "Assignment",
  exam: "Exam",
  competition: "Competition",
  task: "Task",
};

const priorityColors: Record<EventPriority, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onMarkDone: (event: Event) => void;
  onDelete: (event: Event) => void;
}

export function EventCard({ event, onEdit, onMarkDone, onDelete }: EventCardProps) {
  const Icon = typeIcons[event.type];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              event.type === "exam" ? "bg-red-100 dark:bg-red-900/30" :
              event.type === "competition" ? "bg-purple-100 dark:bg-purple-900/30" :
              event.type === "assignment" ? "bg-orange-100 dark:bg-orange-900/30" :
              event.type === "task" ? "bg-green-100 dark:bg-green-900/30" :
              "bg-blue-100 dark:bg-blue-900/30"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                event.type === "exam" ? "text-red-600 dark:text-red-400" :
                event.type === "competition" ? "text-purple-600 dark:text-purple-400" :
                event.type === "assignment" ? "text-orange-600 dark:text-orange-400" :
                event.type === "task" ? "text-green-600 dark:text-green-400" :
                "text-blue-600 dark:text-blue-400"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{event.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {typeLabels[event.type]}
                </Badge>
                <Badge className={cn("text-xs", priorityColors[event.priority])}>
                  {event.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {format(new Date(event.date), "MMM d, yyyy")}
                </span>
                {event.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.time}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-accent">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(event)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMarkDone(event)}>
                <Check className="w-4 h-4 mr-2" />
                Mark Done
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(event)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
