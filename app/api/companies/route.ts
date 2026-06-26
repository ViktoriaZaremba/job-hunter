import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function getUserId(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  return data?.id ?? null;
}

/**
 * GET /api/companies
 *
 * ?scope=scraper → returns user's own + global (user_id IS NULL) companies
 * default        → returns only user's own companies (for Companies page)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const scope = request.nextUrl.searchParams.get("scope");

    let query = supabase.from("companies").select("*").order("name");

    if (scope === "scraper") {
      // User's own + all global companies (visible to everyone for scraping)
      query = query.or(`user_id.eq.${userId},is_global.eq.true`);
    } else {
      // Only user's own (Companies page)
      query = query.eq("user_id", userId);
    }

    const { data: companies, error } = await query;
    if (error) throw error;

    const transformed = (companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      careersUrl: c.careers_url,
      createdAt: c.created_at,
      isGlobal: c.is_global ?? false,
      domains: c.domains ?? (c.domain ? [c.domain] : []),
      companyType: c.company_type ?? undefined,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies — creates a company owned by the current user.
 */
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

    if (!body.name?.trim() || !body.careersUrl?.trim()) {
      return NextResponse.json(
        { error: "Name and careers URL are required" },
        { status: 400 }
      );
    }

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name: body.name.trim(),
        careers_url: body.careersUrl.trim(),
        user_id: userId,
        domains: body.domains ?? [],
        company_type: body.companyType?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        id: company.id,
        name: company.name,
        careersUrl: company.careers_url,
        createdAt: company.created_at,
        isGlobal: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
