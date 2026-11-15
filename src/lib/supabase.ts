import { createClient } from "@supabase/supabase-js";
import { publicProject } from "./public-project";
const url = import.meta.env.VITE_SUPABASE_URL || publicProject.url;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || publicProject.publishableKey;
export const initialRecovery =
  new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
export const authLinkFailed = new URLSearchParams(location.hash.slice(1)).has(
  "error_description",
);
export const configured = !!url && !!key && !url.includes("YOUR-");
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    })
  : null;
export function client() {
  if (!supabase) throw new Error("notConfigured");
  return supabase;
}
// No hash route in redirect URLs: Auth uses the fragment to deliver tokens.
export function authRedirect() {
  return `${location.origin}${import.meta.env.BASE_URL}`;
}
