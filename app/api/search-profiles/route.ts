import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { listSearchProfiles, dbToProfile } from "@/lib/search-profiles-store";

async function getUserId(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  return data?.id ?? null;
}

function sanitizeKeywords(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const profiles = await listSearchProfiles(userId);
    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error("GET /api/search-profiles:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const targets = sanitizeKeywords(body.targetKeywords);
    const preferred = sanitizeKeywords(body.preferredKeywords);
    const excluded = sanitizeKeywords(body.excludedKeywords);
    const makeDefault = body.isDefault === true;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (targets.length === 0) {
      return NextResponse.json(
        { error: "At least one target keyword is required" },
        { status: 400 }
      );
    }

    // If new profile should be default, unset previous default first
    if (makeDefault) {
      await supabase
        .from("search_profiles")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("search_profiles")
      .insert({
        user_id: userId,
        name,
        target_keywords: targets,
        preferred_keywords: preferred,
        excluded_keywords: excluded,
        is_default: makeDefault,
      })
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(dbToProfile(data), { status: 201 });
  } catch (error: any) {
    console.error("POST /api/search-profiles:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create profile" },
      { status: 500 }
    );
  }
}
