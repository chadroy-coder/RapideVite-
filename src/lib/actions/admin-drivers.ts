"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { driverSchema, type DriverInput } from "@/lib/validations/schemas";
import type { Driver } from "@/types/database";

export async function listDrivers(): Promise<Driver[]> {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("drivers").select("*").order("name", { ascending: true });
  return (data ?? []) as Driver[];
}

export async function createDriver(input: DriverInput) {
  const { supabase } = await requireStaff();
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  const { error } = await supabase.from("drivers").insert({
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    photo_url: parsed.data.photo_url || null,
    active: parsed.data.active ?? true,
  });

  if (error) return { error: "Impossible d'ajouter le livreur." };
  revalidatePath("/admin/livreurs");
  return { error: null };
}

export async function updateDriver(id: string, input: DriverInput) {
  const { supabase } = await requireStaff();
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  const { error } = await supabase
    .from("drivers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      photo_url: parsed.data.photo_url || null,
      active: parsed.data.active ?? true,
    })
    .eq("id", id);

  if (error) return { error: "Impossible de modifier le livreur." };
  revalidatePath("/admin/livreurs");
  return { error: null };
}

export async function deleteDriver(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer le livreur." };
  revalidatePath("/admin/livreurs");
  return { error: null };
}

export async function uploadDriverAvatarPhoto(formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier fourni.", url: null };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `drivers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) return { error: "Echec du telechargement de la photo.", url: null };

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}
