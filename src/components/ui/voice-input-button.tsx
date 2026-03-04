"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Loader2, Wand2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SmartInputProps {
  onResult: (parsed: {
    title?: string;
    category?: string;
    client?: string | null;
    deadline?: string | null;
    estimatedHours?: number | null;
    status?: string;
    toComplete?: string | null;
  }) => void;
  onError?: (msg: string) => void;
}

async function parseText(text: string): Promise<any> {
  const res = await fetch("/api/ai/parse-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to parse input");
  }
  return res.json();
}

export function SmartTaskInput({ onResult, onError }: SmartInputProps) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const manualStopRef = useRef(false);
  const transcriptRef = useRef("");

  const handleParse = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseText(input);
      onResult(parsed);
      setText("");
    } catch (err: any) {
      onError?.(err.message || "Failed to parse input");
    } finally {
      setParsing(false);
    }
  }, [onResult, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const stopAndParse = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);

    const transcript = transcriptRef.current.trim();
    if (transcript) {
      handleParse(transcript);
    }
  }, [handleParse]);

  const startListening = useCallback(() => {
    const win = window as any;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      onError?.("Speech recognition not supported in this browser. Type your task instead.");
      return;
    }

    manualStopRef.current = false;
    transcriptRef.current = "";

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = final;
      setText((final + interim).trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        onError?.("Microphone access denied. Allow mic access in browser settings, or type your task instead.");
        setListening(false);
        recognitionRef.current = null;
      } else if (event.error === "network") {
        // Network error means Google's speech servers are unreachable.
        // Keep listening state briefly so user sees feedback, then fall back.
        onError?.("Voice recognition needs an internet connection. Type your task description and press the wand button instead.");
        setListening(false);
        recognitionRef.current = null;
      } else if (event.error === "no-speech") {
        // Silence timeout - restart if still meant to be listening
        if (!manualStopRef.current && recognitionRef.current) {
          try { recognition.start(); } catch { /* already running */ }
        }
      }
    };

    recognition.onend = () => {
      if (manualStopRef.current) return; // user clicked stop, already handled

      // Browser auto-stopped (timeout, etc.) - restart to keep listening
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // Can't restart, finalize
          setListening(false);
          recognitionRef.current = null;
          const transcript = transcriptRef.current.trim();
          if (transcript) handleParse(transcript);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      onError?.("Could not start voice recognition. Type your task instead.");
    }
  }, [handleParse, onError]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Send report to Acme, admin, due Friday, 2hrs"'
          className="pr-10 text-sm"
          disabled={parsing}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleParse(text);
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => handleParse(text)}
        disabled={parsing || !text.trim() || listening}
        title="Parse with AI"
        className="shrink-0"
      >
        {parsing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        size="sm"
        onClick={listening ? stopAndParse : startListening}
        disabled={parsing}
        title={listening ? "Stop & parse" : "Voice input"}
        className="shrink-0"
      >
        {listening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
