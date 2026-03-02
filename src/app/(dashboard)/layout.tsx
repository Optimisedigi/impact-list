import { Sidebar } from "@/components/layout/sidebar";
import { FloatingAddTask } from "@/components/layout/floating-add-task";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-56 min-h-screen p-6">{children}</main>
      <FloatingAddTask />
    </div>
  );
}
