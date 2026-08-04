import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/Toaster";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();

  // middleware.ts already blocks unauthenticated / non-staff visitors from
  // reaching /admin, but we re-check here so this layout is safe even if
  // rendered in a context where middleware was bypassed (defense in depth).
  if (!user || !profile || (profile.role !== "admin" && profile.role !== "staff")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-brand-cream/40">
      <Toaster />
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
