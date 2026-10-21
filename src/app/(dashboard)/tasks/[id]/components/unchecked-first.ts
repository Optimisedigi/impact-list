import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";

const TASK_LIST = "taskList";
const TASK_ITEM = "taskItem";

function isChecked(node: PMNode): boolean {
  return node.type.name === TASK_ITEM && node.attrs.checked === true;
}

/** Children of a taskList with unchecked items first; relative order is kept. */
function sortedChildren(list: PMNode): PMNode[] | null {
  const children: PMNode[] = [];
  list.forEach((child) => children.push(child));
  const sorted = [
    ...children.filter((c) => !isChecked(c)),
    ...children.filter((c) => isChecked(c)),
  ];
  return sorted.some((c, i) => c !== children[i]) ? sorted : null;
}

function findUnsortedList(
  doc: PMNode
): { pos: number; node: PMNode; sorted: PMNode[] } | null {
  let found: { pos: number; node: PMNode; sorted: PMNode[] } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name !== TASK_LIST) return true;
    const sorted = sortedChildren(node);
    if (sorted) {
      found = { pos, node, sorted };
      return false;
    }
    return true;
  });
  return found;
}

/**
 * Reorders every checklist in the transaction's doc so unchecked items sit
 * above checked ones. Nested items move with their parent item; nested
 * checklists are sorted independently. Returns true if anything moved.
 */
export function sortChecklists(tr: Transaction): boolean {
  let changed = false;
  // Each pass sorts one list; bounded by the number of lists in the doc.
  for (let i = 0; i < 1000; i++) {
    const target = findUnsortedList(tr.doc);
    if (!target) break;
    tr.replaceWith(
      target.pos + 1,
      target.pos + target.node.nodeSize - 1,
      Fragment.fromArray(target.sorted)
    );
    changed = true;
  }
  return changed;
}

function checkedStates(doc: PMNode): boolean[] {
  const states: boolean[] = [];
  doc.descendants((node) => {
    if (node.type.name === TASK_ITEM) states.push(isChecked(node));
  });
  return states;
}

/** True when the same set of items exists but at least one was (un)ticked. */
export function checkboxToggled(oldDoc: PMNode, newDoc: PMNode): boolean {
  const before = checkedStates(oldDoc);
  const after = checkedStates(newDoc);
  return (
    before.length === after.length && before.some((s, i) => s !== after[i])
  );
}

const pluginKey = new PluginKey("uncheckedFirst");

/**
 * Keeps unchecked checklist items at the top of each checklist. Sorting runs
 * when an item is ticked/unticked (not while typing, so new items don't jump),
 * and once when the editor loads existing notes.
 */
export const UncheckedFirst = Extension.create({
  name: "uncheckedFirst",

  onCreate() {
    const { tr } = this.editor.state;
    if (sortChecklists(tr)) {
      tr.setMeta("addToHistory", false);
      this.editor.view.dispatch(tr);
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((t) => t.docChanged)) return null;
          if (!checkboxToggled(oldState.doc, newState.doc)) return null;
          const tr = newState.tr;
          return sortChecklists(tr) ? tr : null;
        },
      }),
    ];
  },
});
