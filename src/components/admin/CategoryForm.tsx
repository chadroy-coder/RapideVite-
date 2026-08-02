"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categorySchema, type CategoryInput } from "@/lib/validations/schemas";
import { createCategory, updateCategory } from "@/lib/actions/admin-categories";
import { useToastStore } from "@/store/toast-store";
import { slugify } from "@/lib/format";

export function CategoryForm({
  categoryId,
  defaultValues,
}: {
  categoryId?: string;
  defaultValues?: Partial<CategoryInput>;
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { active: true, sort_order: 0, ...defaultValues },
  });

  async function onSubmit(values: CategoryInput) {
    setSubmitting(true);
    const result = categoryId ? await updateCategory(categoryId, values) : await createCategory(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(categoryId ? "Categorie mise a jour" : "Categorie creee", "success");
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md bg-white border border-brand-border rounded-2xl p-5">
      <div>
        <label className="text-sm font-medium text-brand-ink">Nom</label>
        <input
          {...register("name", {
            onChange: (e) => {
              if (!categoryId) setValue("slug", slugify(e.target.value));
            },
          })}
          className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Slug</label>
        <input {...register("slug")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
        {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Description</label>
        <textarea {...register("description")} rows={2} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Ordre d&apos;affichage</label>
        <input type="number" {...register("sort_order")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
      </div>
      <label className="flex items-center gap-2 text-sm text-brand-ink">
        <input type="checkbox" {...register("active")} className="rounded" /> Active
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand-orange text-white font-semibold px-6 py-2.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
      >
        {submitting ? "Enregistrement..." : categoryId ? "Mettre a jour" : "Creer la categorie"}
      </button>
    </form>
  );
}
