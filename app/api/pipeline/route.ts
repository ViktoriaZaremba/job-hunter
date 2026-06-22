import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchPipelineForEmail } from "@/lib/pipeline-store";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pipeline = await fetchPipelineForEmail(session.user.email);
    return NextResponse.json(pipeline);
  } catch (error: any) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load pipeline" },
      { status: 500 }
    );
  }
}
