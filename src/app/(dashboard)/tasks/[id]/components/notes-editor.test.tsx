import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { updateTaskNotes } from "@/server/actions/tasks";
import { NotesEditor } from "./notes-editor";

vi.mock("@/server/actions/tasks", () => ({
  updateTaskNotes: vi.fn(async () => ({})),
}));

const saveMock = vi.mocked(updateTaskNotes);

function doc(text: string): string {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
}

function renderEditor(initialContent: string | null, taskId = 7) {
  const ui = (content: string | null) => (
    <TooltipProvider>
      <NotesEditor taskId={taskId} initialContent={content} />
    </TooltipProvider>
  );
  const result = render(ui(initialContent));
  return { ...result, rerenderWith: (c: string | null) => result.rerender(ui(c)) };
}

async function mountedEditor(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector(".ProseMirror")).toBeTruthy());
  const dom = container.querySelector(".ProseMirror") as HTMLElement & { editor: Editor };
  return { dom, editor: dom.editor };
}

/** Types like a browser does: the DOM text changes and ProseMirror reads it back. */
async function typeIntoDom(dom: HTMLElement, text: string) {
  const textNode = dom.querySelector("p")?.firstChild;
  if (!(textNode instanceof Text)) throw new Error("expected a text node");
  await act(async () => {
    textNode.data += text;
    document.getSelection()?.collapse(textNode, textNode.data.length);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

beforeAll(() => {
  // jsdom has no layout; ProseMirror asks for rects when scrolling to the cursor.
  const noRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getClientRects = noRects;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  Element.prototype.getClientRects = noRects;
});

beforeEach(() => {
  saveMock.mockClear();
});

describe("NotesEditor", () => {
  it("keeps characters typed into the editor instead of reverting them", async () => {
    const { container } = renderEditor(doc("hello"));
    const { dom, editor } = await mountedEditor(container);
    editor.commands.focus("end");

    await typeIntoDom(dom, " world");

    expect(editor.getText()).toBe("hello world");
    expect(dom.textContent).toBe("hello world");
  });

  it("saves typed notes once after the debounce, with the latest content", async () => {
    const { container } = renderEditor(doc("hello"));
    const { dom, editor } = await mountedEditor(container);
    editor.commands.focus("end");

    await typeIntoDom(dom, " a");
    await typeIntoDom(dom, "b");

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const [taskId, json] = saveMock.mock.calls[0] ?? [];
    expect(taskId).toBe(7);
    expect(JSON.parse(String(json))).toEqual(JSON.parse(doc("hello ab")));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("does not reset typed content when the server sends refreshed notes", async () => {
    const { container, rerenderWith } = renderEditor(doc("hello"));
    const { dom, editor } = await mountedEditor(container);
    editor.commands.focus("end");

    await typeIntoDom(dom, " there");
    rerenderWith(doc("hello"));
    await act(async () => {});

    expect(editor.getText()).toBe("hello there");
  });

  it("saves pending edits when it unmounts before the debounce fires", async () => {
    const { container, unmount } = renderEditor(doc("hello"));
    const { dom, editor } = await mountedEditor(container);
    editor.commands.focus("end");

    await typeIntoDom(dom, "!");
    expect(saveMock).not.toHaveBeenCalled();
    unmount();

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(saveMock.mock.calls[0]?.[1]))).toEqual(JSON.parse(doc("hello!")));
  });
});
