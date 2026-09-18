"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/validations/schemas";

// Edits the signed-in user's own profile (full_name/phone) - the only place
// this should happen. Checkout used to silently overwrite these on every
// order (so a gift order for someone else clobbered your own account info,
// and Woulib had no working way to fix a missing phone number) - that sync
// was removed from placeOrder(); this is the one real source of truth now.
export async function updateProfile(input: ProfileInput) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez etre connecte." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
    .eq("id", user.id);

  if (error) return { error: "Impossible de mettre a jour votre profil." };

  revalidatePath("/compte");
  revalidatePath("/woulib");
  return { error: null };
}
