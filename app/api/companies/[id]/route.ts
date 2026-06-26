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
 * Verify the company belongs to the current user (not global, not another user's).
 */
async function verifyOwnership(
  companyId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: company } = await supabase
    .from("companies")
    .select("user_id, is_global")
    .eq("id", companyId)
    .single();

  if (!company) return { ok: false, error: "Company not found" };
  if (company.is_global && company.user_id !== userId)
    return { ok: false, error: "Cannot modify a shared company" };
  if (company.user_id !== userId)
    return { ok: false, error: "Not your company" };
  return { ok: true };
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
    if (!userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ownership = await verifyOwnership(params.id, userId);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
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
    if (!userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ownership = await verifyOwnership(params.id, userId);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.careersUrl !== undefined) updates.careers_url = body.careersUrl;
    if (body.domain !== undefined) updates.domain = body.domain || null;
    if (body.companyType !== undefined) updates.company_type = body.companyType || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const { data: company, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: company.id,
      name: company.name,
      careersUrl: company.careers_url,
      createdAt: company.created_at,
      isGlobal: false,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}
