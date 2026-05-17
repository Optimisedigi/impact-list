"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  importEventsCsv,
  previewImport,
  type ImportResult,
} from "@/server/actions/calendar-import";

interface ImportEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultYear: number;
}

export function ImportEventsDialog({
  open,
  onOpenChange,
  defaultYear,
}: ImportEventsDialogProps) {
  const [csv, setCsv] = useState("");
  const [year, setYear] = useState<number>(defaultYear);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => setCsv(t));
  }

  function handlePreview() {
    startTransition(async () => {
      const r = await previewImport(csv, year);
      setResult(r);
    });
  }

  function handleImport() {
    startTransition(async () => {
      const r = await importEventsCsv(csv, year);
      setResult(r);
      if (r.success && r.imported && r.imported > 0) {
        // Keep dialog open so user can see the result, but reset csv.
        setCsv("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import events from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Supports the year-grid sheet layout (12 month columns) or a flat
            CSV with columns: title, date, end_date, all_day, color,
            description, location.
          </p>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="import-year">Year</Label>
              <Input
                id="import-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
                className="w-24"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="import-file">File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="import-csv">CSV text</Label>
            <Textarea
              id="import-csv"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder="Paste CSV here or upload a file above"
              className="font-mono text-xs"
            />
          </div>
          {result?.preview && result.preview.length > 0 && (
            <div className="rounded-md border border-border bg-card p-2">
              <p className="mb-1 text-xs font-medium">
                Preview ({result.format}, showing {Math.min(5, result.preview.length)} of{" "}
                {result.preview.length}):
              </p>
              <ul className="space-y-0.5 text-xs">
                {result.preview.slice(0, 5).map((ev, i) => (
                  <li key={i} className="truncate">
                    <span className="text-muted-foreground tabular-nums">
                      {ev.startsAt}
                    </span>{" "}
                    — {ev.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result && result.imported !== undefined && result.imported > 0 && (
            <p className="text-xs text-foreground">
              Imported {result.imported} events
              {result.skipped ? ` (skipped ${result.skipped})` : ""}.
            </p>
          )}
          {result?.error && (
            <p className="text-xs text-destructive">{result.error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isPending || !csv.trim()}
          >
            Preview
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isPending || !csv.trim()}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
