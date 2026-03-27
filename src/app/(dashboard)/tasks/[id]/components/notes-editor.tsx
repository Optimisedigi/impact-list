"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { updateTaskNotes } from "@/server/actions/tasks";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Heading2,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

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
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-medium mr-2">Notes</h2>
          {editor && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <div className="mx-1 h-4 w-px bg-border" />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                title="Bullet list"
              >
                <List className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                title="Numbered list"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                isActive={editor.isActive("taskList")}
                title="Checklist"
              >
                <CheckSquare className="h-3.5 w-3.5" />
              </ToolbarButton>
              <div className="mx-1 h-4 w-px bg-border" />
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
              >
                <Undo className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
              >
                <Redo className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
