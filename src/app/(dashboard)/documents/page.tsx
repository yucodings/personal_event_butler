"use client";

import { useState, useEffect, useCallback } from "react";
import { Document as DocType, ExtractedEvent } from "@/types";
import { UploadArea } from "@/components/documents/upload-area";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentDetail } from "@/components/documents/document-detail";
import { EventForm } from "@/components/dashboard/event-form";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [reviewEvents, setReviewEvents] = useState<ExtractedEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadComplete = (results: any[]) => {
    fetchDocuments();

    // If there are events to review, start review flow
    if (results.length > 0 && results[0].events && results[0].events.length > 0) {
      setCurrentDocId(results[0].document.id);
      setReviewEvents(results[0].events);
      setCurrentEventIndex(0);
      setFormOpen(true);
    }
  };

  const handleDelete = async (doc: DocType) => {
    if (!confirm(`Delete "${doc.file_name}" and all linked events?`)) return;

    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Document deleted");
        fetchDocuments();
        if (selectedDocId === doc.id) {
          setSelectedDocId(null);
        }
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleSaveEvent = async () => {
    if (reviewEvents.length === 0) return;

    const event = reviewEvents[currentEventIndex];

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          status: "ongoing",
          document_id: currentDocId,
        }),
      });

      if (response.ok) {
        toast.success(`Event "${event.title}" saved!`);

        if (currentEventIndex < reviewEvents.length - 1) {
          setCurrentEventIndex(currentEventIndex + 1);
          setFormOpen(true);
        } else {
          setReviewEvents([]);
          setCurrentEventIndex(0);
          setFormOpen(false);
          setCurrentDocId(null);
          fetchDocuments();
        }
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    }
  };

  const handleSkipEvent = () => {
    if (currentEventIndex < reviewEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1);
      setFormOpen(true);
    } else {
      setReviewEvents([]);
      setCurrentEventIndex(0);
      setFormOpen(false);
      setCurrentDocId(null);
    }
  };

  if (selectedDocId) {
    return (
      <DocumentDetail
        documentId={selectedDocId}
        onBack={() => setSelectedDocId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Upload files to extract events and deadlines</p>
      </div>

      <UploadArea onUploadComplete={handleUploadComplete} />

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          My Documents
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <DocumentList
            documents={documents}
            onSelect={(doc) => setSelectedDocId(doc.id)}
            onDelete={handleDelete}
          />
        )}
      </div>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={null}
        extractedData={reviewEvents[currentEventIndex] || null}
        showSkip={reviewEvents.length > 1}
        currentEventIndex={currentEventIndex}
        totalEvents={reviewEvents.length}
        onSave={handleSaveEvent}
        onSkip={handleSkipEvent}
      />
    </div>
  );
}
