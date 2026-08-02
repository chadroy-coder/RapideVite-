"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { categorySchema, type CategoryInput } from "@/lib/validations/schemas";

export async function listCategoriesAdmin() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: CategoryInput) {
  const { supabase } = await requireStaff();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return { error: error.message.includes("duplicate") ? "Ce slug existe deja." : "Impossible de creer la categorie." };
  revalidatePath("/admin/categories");
  return { error: null };
}

export async function updateCategory(id: string, input: CategoryInput) {
  const { supabase } = await requireStaff();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id);
  if (error) return { error: "Impossible de mettre a jour la categorie." };
  revalidatePath("/admin/categories");
  return { error: null };
}

export async function toggleCategoryActive(id: string, active: boolean) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) return { error: "Impossible de mettre a jour la categorie." };
  revalidatePath("/admin/categories");
  return { error: null };
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer (des produits utilisent peut-etre cette categorie)." };
  revalidatePath("/admin/categories");
  return { error: null };
}
