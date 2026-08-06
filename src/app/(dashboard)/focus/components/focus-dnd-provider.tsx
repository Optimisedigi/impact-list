"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useTransition,
  type ReactNode,
} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  promoteToTopPriority,
  sendToFocus,
  setFocusPosition,
} from "@/server/actions/tasks";

type ReorderHandler = (activeId: number, overId: number) => void;

interface FocusDndApi {
  registerReorder: (container: string, handler: ReorderHandler) => void;
  registerItems: (container: string, ids: number[]) => void;
  isPending: boolean;
}

const FocusDndCtx = createContext<FocusDndApi>({
  registerReorder: () => {},
  registerItems: () => {},
  isPending: false,
});

export const useFocusDnd = () => useContext(FocusDndCtx);

export function FocusDndProvider({ children }: { children: ReactNode }) {
  const reorderHandlers = useRef<Record<string, ReorderHandler>>({});
  const containerItems = useRef<Record<string, number[]>>({});
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const registerReorder = useCallback(
    (container: string, handler: ReorderHandler) => {
      reorderHandlers.current[container] = handler;
    },
    []
  );

  const registerItems = useCallback((container: string, ids: number[]) => {
    containerItems.current[container] = ids;
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = active.data.current?.sortable?.containerId as
      | string
      | undefined;
    const overContainer = (over.data.current?.sortable?.containerId ??
      over.id) as string;

    const topIds = containerItems.current["top-priority"] ?? [];
    const weekIds = containerItems.current["week-queue"] ?? [];
    const visibleIds = [...topIds, ...weekIds];
    const topCount = topIds.length;
    const activeId = active.id as number;

    // Cross-container: This Week → Top Priority
    if (
      activeContainer === "week-queue" &&
      (overContainer === "top-priority" || overContainer === "top-priority-drop")
    ) {
      const overIndex = topIds.indexOf(over.id as number);
      startTransition(async () => {
        if (topCount === 0 || overIndex === -1) {
          await promoteToTopPriority(activeId);
        } else {
          await setFocusPosition(activeId, overIndex, visibleIds, topCount);
        }
      });
      return;
    }

    // Cross-container: Top Priority → This Week
    if (
      activeContainer === "top-priority" &&
      (overContainer === "week-queue" || overContainer === "week-queue-drop")
    ) {
      const overIndex = weekIds.indexOf(over.id as number);
      startTransition(async () => {
        // An empty queue has no position to target — setFocusPosition would clamp
        // back inside the top slots and re-pin the card as "today".
        if (weekIds.length === 0) {
          await sendToFocus(activeId, "this_week");
          return;
        }
        // Target must land at or past the top slots so the card is demoted to
        // "this_week"; the vacated top slot is refilled from the queue head.
        const weekIndex = overIndex === -1 ? weekIds.length : overIndex;
        const target = topCount + weekIndex;
        await setFocusPosition(activeId, target, visibleIds, topCount);
      });
      return;
    }

    // Within same container: reorder
    if (
      activeContainer &&
      activeContainer === overContainer &&
      active.id !== over.id
    ) {
      reorderHandlers.current[activeContainer]?.(
        active.id as number,
        over.id as number
      );
    }
  }

  return (
    <FocusDndCtx.Provider value={{ registerReorder, registerItems, isPending }}>
      <DndContext
        id="focus-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    </FocusDndCtx.Provider>
  );
}
