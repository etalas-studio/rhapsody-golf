import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || url === "https://your-project.supabase.co") {
  console.warn("[supabase] VITE_SUPABASE_URL not set — auth will not work. Add it to frontend/.env");
}

export const supabase = createClient(url ?? "", key ?? "");
