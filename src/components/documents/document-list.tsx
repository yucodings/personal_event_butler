"use client";

import { Document } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, FileSpreadsheet, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface DocumentListProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
  onDelete: (doc: Document) => void;
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

export function DocumentList({ documents, onSelect, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const Icon = typeIcons[doc.file_type] || FileText;
        return (
          <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3" onClick={() => onSelect(doc)}>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{doc.file_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[doc.file_type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {doc.events_count} event{doc.events_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {doc.processed_text && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {doc.processed_text.substring(0, 80)}...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
