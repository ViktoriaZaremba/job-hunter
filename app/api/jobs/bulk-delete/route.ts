import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const ids: string[] = body.ids ?? [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("jobs")
      .delete()
      .in("id", ids)
      .eq("user_id", user.id); // ensure user can only delete their own jobs

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Error bulk deleting jobs:", error);
    return NextResponse.json(
      { error: "Failed to delete jobs" },
      { status: 500 }
    );
  }
}
