import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="shrink-0 pb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-1 h-4 w-96" />
      </div>
      <Skeleton className="flex-1 min-h-0 w-full" />
    </div>
  );
}
