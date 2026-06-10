import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="shrink-0 pb-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-[34rem]" />
      </div>
      <Skeleton className="min-h-0 flex-1 w-full" />
    </div>
  );
}
