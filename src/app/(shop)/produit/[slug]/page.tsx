import { getProductBySlug } from "@/lib/data";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { notFound } from "next/navigation";
import type { Product, ProductVariant } from "@/types/database";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return <ProductDetailClient product={product as Product & { variants: ProductVariant[] }} />;
}
