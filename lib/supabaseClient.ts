import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ppjgsiwjwugspgwqljsb.supabase.co";
const supabaseKey = "sb_publishable_GdfOoWUpdQVbHth-qboRsg_q6cVN8D2";

export const supabase = createClient(supabaseUrl, supabaseKey);