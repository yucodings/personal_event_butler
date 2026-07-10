"use client";

import { useState, useEffect } from "react";
import { DocumentDetail as DocumentDetailType, Event } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentDetailProps {
  documentId: string;
  onBack: () => void;
}

const typeIcons: Record<string, typeof FileText> = {
  image: ImageIcon,
  pdf: FileText,
  doc: FileText,
  txt: FileSpreadsheet,
};

const typeLabels: Record<string, string> = {
  image: "Image",
  pdf: "PDF",
  doc: "Word",
  txt: "Text",
};

const eventTypeColors: Record<string, string> = {
  event: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  assignment: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  exam: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  competition: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  task: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export function DocumentDetail({ documentId, onBack }: DocumentDetailProps) {
  const [doc, setDoc] = useState<DocumentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setDoc(data);
      } else {
        toast.error("Failed to load document");
        onBack();
      }
    } catch {
      toast.error("Failed to load document");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!doc) return null;

  const Icon = typeIcons[doc.file_type] || FileText;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{doc.file_name}</h2>
          <p className="text-sm text-muted-foreground">
            {typeLabels[doc.file_type]} • {format(new Date(doc.created_at), "MMM d, yyyy")} •{" "}
            {doc.events_count} event{doc.events_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {doc.processed_text && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {doc.processed_text}
            </div>
          </CardContent>
        </Card>
      )}

      {doc.ocr_text && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Extracted Text</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setShowRawText(!showRawText)}
              >
                {showRawText ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" /> Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showRawText && (
            <CardContent>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-60 overflow-y-auto p-3 bg-muted rounded-lg">
                {doc.ocr_text}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {doc.events && doc.events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events from this Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {doc.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      eventTypeColors[event.type] || "bg-gray-100"
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "MMM d, yyyy")}
                        {event.time && ` @ ${event.time}`}
                      </span>
                      <Badge
                        className={cn(
                          "text-xs",
                          event.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : event.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {event.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
