import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("*").eq("id", id).single();
  if (!category) notFound();

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Modifier la categorie</h1>
      <CategoryForm
        categoryId={id}
        defaultValues={{
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          sort_order: category.sort_order,
          active: category.active,
        }}
      />
    </div>
  );
}
