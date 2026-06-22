import { supabase } from "@/lib/supabase";
import { SearchProfile } from "@/types";

function dbToProfile(row: any): SearchProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetKeywords: row.target_keywords ?? [],
    preferredKeywords: row.preferred_keywords ?? [],
    excludedKeywords: row.excluded_keywords ?? [],
    isDefault: row.is_default,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listSearchProfiles(userId: string): Promise<SearchProfile[]> {
  const { data, error } = await supabase
    .from("search_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToProfile);
}

export async function getSearchProfile(id: string): Promise<SearchProfile | null> {
  const { data, error } = await supabase
    .from("search_profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data ? dbToProfile(data) : null;
}

export async function getDefaultProfile(userId: string): Promise<SearchProfile | null> {
  const { data } = await supabase
    .from("search_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  return data ? dbToProfile(data) : null;
}

export async function getProfileForScrape(
  userId: string,
  profileId?: string
): Promise<SearchProfile> {
  if (profileId) {
    const p = await getSearchProfile(profileId);
    if (p && p.userId === userId) return p;
  }
  const def = await getDefaultProfile(userId);
  if (def) return def;
  // Fallback: any profile
  const list = await listSearchProfiles(userId);
  if (list.length > 0) return list[0];
  throw new Error("User has no search profiles");
}

export async function touchLastUsed(profileId: string): Promise<void> {
  await supabase
    .from("search_profiles")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", profileId);
}

export { dbToProfile };
