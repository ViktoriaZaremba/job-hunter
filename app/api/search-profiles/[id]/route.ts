import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { dbToProfile, getSearchProfile } from "@/lib/search-profiles-store";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await getSearchProfile(params.id);
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: any = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.targetKeywords !== undefined) {
      const targets = sanitizeKeywords(body.targetKeywords);
      if (targets.length === 0) {
        return NextResponse.json(
          { error: "At least one target keyword is required" },
          { status: 400 }
        );
      }
      updates.target_keywords = targets;
    }

    if (body.preferredKeywords !== undefined) {
      updates.preferred_keywords = sanitizeKeywords(body.preferredKeywords);
    }

    if (body.excludedKeywords !== undefined) {
      updates.excluded_keywords = sanitizeKeywords(body.excludedKeywords);
    }

    if (body.isDefault !== undefined) {
      const makeDefault = body.isDefault === true;
      if (makeDefault) {
        await supabase
          .from("search_profiles")
          .update({ is_default: false })
          .eq("user_id", userId)
          .eq("is_default", true);
      } else if (existing.isDefault) {
        return NextResponse.json(
          { error: "Cannot un-default the only default profile. Mark another profile as default instead." },
          { status: 400 }
        );
      }
      updates.is_default = makeDefault;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("search_profiles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(dbToProfile(data));
  } catch (error: any) {
    console.error("PATCH /api/search-profiles/[id]:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await getSearchProfile(params.id);
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Refuse to delete the last profile
    const { count } = await supabase
      .from("search_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot delete your only search profile" },
        { status: 400 }
      );
    }

    // If deleting default, promote another profile to default
    if (existing.isDefault) {
      const { data: other } = await supabase
        .from("search_profiles")
        .select("id")
        .eq("user_id", userId)
        .neq("id", existing.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (other) {
        await supabase
          .from("search_profiles")
          .update({ is_default: true })
          .eq("id", other.id);
      }
    }

    const { error } = await supabase
      .from("search_profiles")
      .delete()
      .eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/search-profiles/[id]:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to delete profile" },
      { status: 500 }
    );
  }
}
