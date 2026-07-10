"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, Loader2 } from "lucide-react";

interface UploadAreaProps {
  onUploadComplete: (results: any[]) => void;
}

export function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    if (files.length > 3) {
      toast.error("Maximum 3 files allowed");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const results = await response.json();
        toast.success(`Processed ${results.length} file(s)`);
        onUploadComplete(results);
      } else {
        const error = await response.json();
        toast.error(error.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <CardContent className="p-8 text-center">
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Processing files...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Images • PDF • Word • Text (max 3 files)
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImageIcon className="w-3 h-3" /> Images
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" /> PDF
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" /> Word
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileSpreadsheet className="w-3 h-3" /> Text
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
