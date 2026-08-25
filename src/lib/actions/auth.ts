"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  phoneNumberSchema,
  phoneOtpSchema,
  type LoginInput,
  type RegisterInput,
  type PhoneNumberInput,
  type PhoneOtpInput,
} from "@/lib/validations/schemas";

export async function signIn(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Email ou mot de passe incorrect." };
  return { error: null };
}

export async function signUp(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
    },
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// Sends a 6-digit SMS code to the given phone number. Works for both new
// and returning users - Supabase creates the auth.users row on first use,
// same account on repeat use, no separate "sign up" call needed.
export async function sendPhoneOtp(input: PhoneNumberInput) {
  const parsed = phoneNumberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Numero invalide" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
    options: parsed.data.full_name ? { data: { full_name: parsed.data.full_name } } : undefined,
  });
  if (error) {
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return { error: "Trop de tentatives. Veuillez patienter une minute avant de reessayer." };
    }
    return { error: "Impossible d'envoyer le code. Verifiez le numero et reessayez." };
  }
  return { error: null };
}

// Verifies the SMS code and completes sign-in/sign-up in one step.
export async function verifyPhoneOtp(input: PhoneOtpInput) {
  const parsed = phoneOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });
  if (error) return { error: "Code incorrect ou expire." };

  // Full name only reaches raw_user_meta_data (and the profiles trigger) on
  // the account's first ever OTP send. If this is a first-time signup that
  // included a name, make sure it actually lands on the profile row too.
  if (parsed.data.full_name) {
    await supabase.auth.updateUser({ data: { full_name: parsed.data.full_name } });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ full_name: parsed.data.full_name })
        .eq("id", user.id)
        .is("full_name", null);
    }
  }

  return { error: null };
}
