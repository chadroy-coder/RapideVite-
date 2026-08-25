"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  phoneLoginSchema,
  phoneRegisterSchema,
  type LoginInput,
  type RegisterInput,
  type PhoneLoginInput,
  type PhoneRegisterInput,
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

// Phone number + password sign-in - no SMS involved, same idea as email
// login but with `phone` instead of `email`.
export async function signInWithPhone(input: PhoneLoginInput) {
  const parsed = phoneLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    phone: parsed.data.phone,
    password: parsed.data.password,
  });
  if (error) return { error: "Numero ou mot de passe incorrect." };
  return { error: null };
}

// Phone number + password sign-up. Requires "Confirm phone" to be turned
// OFF under Authentication > Providers > Phone in the Supabase dashboard -
// otherwise Supabase expects to send a confirmation SMS (which needs a
// paid SMS provider we're intentionally not using).
export async function signUpWithPhone(input: PhoneRegisterInput) {
  const parsed = phoneRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    phone: parsed.data.phone,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return { error: "Ce numero est deja utilise. Essayez de vous connecter." };
    }
    return { error: error.message };
  }
  return { error: null };
}
