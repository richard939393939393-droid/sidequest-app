import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vcctncphqyiujlmbhrul.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjY3RuY3BocXlpdWpsbWJocnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjEyMjUsImV4cCI6MjA4ODEzNzIyNX0.Bs8eIHZlsv3hGb9KT4KYJT-t3rURNAykbnZo7jzFVt8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
