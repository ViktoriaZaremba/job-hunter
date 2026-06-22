import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { dbToApplication } from "@/lib/api-transformers";
import { getBusinessDaysSinceContact } from "@/lib/pipeline-helpers";
import { fetchPipelineForUser } from "@/lib/pipeline-store";

export async function GET(request: NextRequest) {
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

    const { data: applications, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const transformed = (applications ?? []).map((app) => {
      const a = dbToApplication(app);
      if (a.lastContactDate) {
        a.businessDaysSinceContact = getBusinessDaysSinceContact(
          a.lastContactDate
        );
      }
      return a;
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
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

    const body = await request.json();

    if (!body.companyName || !body.position) {
      return NextResponse.json(
        { error: "companyName and position are required" },
        { status: 400 }
      );
    }

    // Get or create user
    let { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email: session.user.email,
          name: session.user.name || "",
          image: session.user.image,
        })
        .select("id")
        .single();
      user = newUser;
      // The users_seed_pipeline trigger created the pipeline already.
    }

    // Find To-do stage in user's pipeline
    const pipeline = await fetchPipelineForUser(user!.id);
    const todoStage =
      pipeline.stages.find((s) => s.name === "To-do") ??
      pipeline.stages
        .filter((s) => s.type === "normal")
        .sort((a, b) => a.order - b.order)[0];
    if (!todoStage) {
      return NextResponse.json(
        { error: "Pipeline has no normal stage" },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const dbData = {
      user_id: user!.id,
      company_name: body.companyName,
      position: body.position,
      url: body.url ?? null,
      notes: body.notes ?? null,
      last_contact_date: today,

      // Single source of truth: empty stage_statuses → canonical = To-do
      stage_statuses: {},
      current_stage_id: todoStage.id,
      rejected_at_stage_id: null,
    };

    const { data: application, error } = await supabase
      .from("applications")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("activity_log").insert({
      application_id: application.id,
      event: "Application created",
      details: `${body.position} at ${body.companyName}`,
    });

    return NextResponse.json(dbToApplication(application), { status: 201 });
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create application" },
      { status: 500 }
    );
  }
}
