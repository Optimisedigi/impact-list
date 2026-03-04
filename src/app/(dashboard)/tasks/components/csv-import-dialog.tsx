"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importCsv } from "@/server/actions/csv-import";
import { Upload } from "lucide-react";

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    skipped?: number;
    error?: string;
    errors?: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const lines = text.trim().split("\n").slice(0, 4);
      setPreview(lines);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    startTransition(async () => {
      const res = await importCsv(csvText);
      setResult(res);
      if (res.success) {
        setTimeout(() => setOpen(false), 1500);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCsvText(""); setPreview([]); setResult(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1 h-4 w-4" />
          Import CSV of Tasks (Bulk Upload)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />

          {preview.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Preview (first 3 rows):</p>
              <div className="space-y-1 overflow-x-auto">
                {preview.map((line, i) => (
                  <p key={i} className={`whitespace-nowrap font-mono text-xs ${i === 0 ? "font-bold" : ""}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-md p-3 text-sm ${result.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {result.success
                ? `Imported ${result.imported} tasks. ${result.skipped ? `Skipped ${result.skipped}.` : ""}`
                : result.error}
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!csvText || isPending}>
              {isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
