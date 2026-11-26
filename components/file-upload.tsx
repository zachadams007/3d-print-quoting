"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, AlertTriangle } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { FileEstimate } from "@/lib/types";

interface FileUploadProps {
  fileEstimates: FileEstimate[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  processing: boolean;
}

export function FileUpload({
  fileEstimates,
  onFilesAdded,
  onFileRemoved,
  processing,
}: FileUploadProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFilesAdded(accepted);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "model/stl": [".stl"],
      "application/octet-stream": [".stl", ".3mf"],
      "application/zip": [".3mf"],
      "application/vnd.ms-package.3dmanufacturing-3dmodel+xml": [".3mf"],
    },
    maxSize: 100 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop STL or 3MF files"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse (max 100MB per file)
        </p>
      </div>

      {processing && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Analyzing files...
        </p>
      )}

      {fileEstimates.length > 0 && (
        <ul className="space-y-2">
          {fileEstimates.map((fe, i) => (
            <li
              key={`${fe.fileName}-${i}`}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fe.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {(fe.fileSize / 1024 / 1024).toFixed(1)} MB
                  {fe.volumeCm3 != null && (
                    <> &middot; {formatNumber(fe.volumeCm3)} cm&sup3;</>
                  )}
                  {fe.manualRequired && (
                    <span className="ml-2 inline-flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="h-3 w-3" />
                      Manual review — try a different file type or re-export if
                      needed
                    </span>
                  )}
                  {fe.error && (
                    <span className="ml-2 text-destructive">{fe.error}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFileRemoved(i)}
                className="shrink-0 rounded p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
