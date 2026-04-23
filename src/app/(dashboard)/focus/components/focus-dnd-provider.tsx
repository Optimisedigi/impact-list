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
import { promoteToTopPriority } from "@/server/actions/tasks";

type ReorderHandler = (activeId: number, overId: number) => void;

interface FocusDndApi {
  registerReorder: (container: string, handler: ReorderHandler) => void;
  isPending: boolean;
}

const FocusDndCtx = createContext<FocusDndApi>({
  registerReorder: () => {},
  isPending: false,
});

export const useFocusDnd = () => useContext(FocusDndCtx);

export function FocusDndProvider({ children }: { children: ReactNode }) {
  const reorderHandlers = useRef<Record<string, ReorderHandler>>({});
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = active.data.current?.sortable?.containerId as
      | string
      | undefined;
    const overContainer = (over.data.current?.sortable?.containerId ??
      over.id) as string;

    // Cross-container: week-queue → top-priority
    if (
      activeContainer === "week-queue" &&
      (overContainer === "top-priority" ||
        overContainer === "top-priority-drop")
    ) {
      startTransition(async () => {
        await promoteToTopPriority(active.id as number);
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
    <FocusDndCtx.Provider value={{ registerReorder, isPending }}>
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
