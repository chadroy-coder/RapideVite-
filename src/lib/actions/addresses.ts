"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, type AddressInput } from "@/lib/validations/schemas";

// Address CRUD for the signed-in user. RLS (addresses_owner_all policy)
// already restricts every read/write to rows where user_id = auth.uid(),
// so these just need to attach the user id - no extra ownership checks
// needed beyond the .eq("user_id", user.id) filters below.

export async function addAddress(input: AddressInput) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  if (parsed.data.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    label: parsed.data.label,
    department: parsed.data.department,
    commune: parsed.data.commune,
    neighborhood: parsed.data.neighborhood || null,
    street: parsed.data.street,
    delivery_instructions: parsed.data.delivery_instructions || null,
    is_default: parsed.data.is_default ?? false,
  });

  if (error) return { error: "Impossible d'enregistrer l'adresse." };
  revalidatePath("/compte/adresses");
  revalidatePath("/checkout");
  return { error: null };
}

export async function updateAddress(id: string, input: AddressInput) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  if (parsed.data.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("addresses")
    .update({
      label: parsed.data.label,
      department: parsed.data.department,
      commune: parsed.data.commune,
      neighborhood: parsed.data.neighborhood || null,
      street: parsed.data.street,
      delivery_instructions: parsed.data.delivery_instructions || null,
      is_default: parsed.data.is_default ?? false,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Impossible de modifier l'adresse." };
  revalidatePath("/compte/adresses");
  revalidatePath("/checkout");
  return { error: null };
}

export async function deleteAddress(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Impossible de supprimer l'adresse." };
  revalidatePath("/compte/adresses");
  revalidatePath("/checkout");
  return { error: null };
}

export async function setDefaultAddress(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Impossible de definir l'adresse par defaut." };
  revalidatePath("/compte/adresses");
  revalidatePath("/checkout");
  return { error: null };
}
