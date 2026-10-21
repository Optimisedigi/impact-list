import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { EditorState } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";
import { checkboxToggled, sortChecklists } from "./unchecked-first";

const schema = getSchema([StarterKit, TaskList, TaskItem.configure({ nested: true })]);

type Item = { text: string; checked: boolean; children?: Item[] };

function item({ text, checked, children }: Item): object {
  const content: object[] = [
    { type: "paragraph", content: [{ type: "text", text }] },
  ];
  if (children) content.push({ type: "taskList", content: children.map(item) });
  return { type: "taskItem", attrs: { checked }, content };
}

function heading(text: string): object {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function docOf(content: object[]): PMNode {
  return PMNode.fromJSON(schema, { type: "doc", content });
}

function order(doc: PMNode): string[] {
  const out: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      out.push(`${node.attrs.checked ? "x" : " "}${node.firstChild?.textContent}`);
    }
  });
  return out;
}

describe("sortChecklists", () => {
  it("moves unchecked items to the top of each section's checklist, keeping order", () => {
    const doc = docOf([
      heading("A"),
      { type: "taskList", content: [
        item({ text: "a1", checked: true }),
        item({ text: "a2", checked: false }),
        item({ text: "a3", checked: true }),
        item({ text: "a4", checked: false }),
      ] },
      heading("B"),
      { type: "taskList", content: [
        item({ text: "b1", checked: true }),
        item({ text: "b2", checked: false }),
      ] },
    ]);
    const tr = EditorState.create({ doc }).tr;
    expect(sortChecklists(tr)).toBe(true);
    expect(order(tr.doc)).toEqual([" a2", " a4", "xa1", "xa3", " b2", "xb1"]);
    expect(tr.doc.child(2).textContent).toBe("B");
  });

  it("sorts nested checklists independently and moves children with parents", () => {
    const doc = docOf([
      { type: "taskList", content: [
        item({ text: "p1", checked: true, children: [
          { text: "c1", checked: true },
          { text: "c2", checked: false },
        ] }),
        item({ text: "p2", checked: false }),
      ] },
    ]);
    const tr = EditorState.create({ doc }).tr;
    sortChecklists(tr);
    expect(order(tr.doc)).toEqual([" p2", "xp1", " c2", "xc1"]);
  });

  it("leaves an already-sorted doc untouched", () => {
    const doc = docOf([
      { type: "taskList", content: [
        item({ text: "a", checked: false }),
        item({ text: "b", checked: true }),
      ] },
    ]);
    const tr = EditorState.create({ doc }).tr;
    expect(sortChecklists(tr)).toBe(false);
    expect(tr.docChanged).toBe(false);
  });
});

describe("checkboxToggled", () => {
  const list = (a: boolean, b: boolean) =>
    docOf([{ type: "taskList", content: [
      item({ text: "a", checked: a }),
      item({ text: "b", checked: b }),
    ] }]);

  it("detects a tick change", () => {
    expect(checkboxToggled(list(false, false), list(true, false))).toBe(true);
  });

  it("ignores edits that don't change ticks", () => {
    expect(checkboxToggled(list(false, true), list(false, true))).toBe(false);
  });
});
