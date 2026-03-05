"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { updateTaskNotes } from "@/server/actions/tasks";

export function NotesEditor({
  taskId,
  initialContent,
}: {
  taskId: number;
  initialContent: string | null;
}) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsedContent = initialContent ? JSON.parse(initialContent) : undefined;

  const save = useCallback(
    async (json: object) => {
      setSaveStatus("saving");
      await updateTaskNotes(taskId, JSON.stringify(json));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [taskId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing notes...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    immediatelyRender: false,
    content: parsedContent,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm max-w-none min-h-[300px] focus:outline-none p-4",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setSaveStatus("idle");
      saveTimeout.current = setTimeout(() => {
        save(editor.getJSON());
      }, 1000);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Notes</h2>
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
