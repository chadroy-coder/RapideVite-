import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getCurrentUserAndProfile } from "@/lib/data";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getCurrentUserAndProfile();

  return (
    <>
      <Header isAuthed={!!user} />
      <main className="flex-1 pb-bottom-nav md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <CartDrawer />
    </>
  );
}
