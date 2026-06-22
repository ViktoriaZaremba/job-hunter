import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/applications/[id]/activity
 * Get activity log for a specific application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Verify user owns this application
    const { data: app } = await supabase
      .from("applications")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user || user.id !== app.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get activity log
    const { data: activities, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("application_id", id)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Transform to camelCase
    const transformedActivities = activities?.map(activity => ({
      id: activity.id,
      applicationId: activity.application_id,
      timestamp: activity.timestamp,
      event: activity.event,
      details: activity.details,
    }));

    return NextResponse.json(transformedActivities || []);
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/[id]/activity
 * Add a new activity log entry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Verify user owns this application
    const { data: app } = await supabase
      .from("applications")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user || user.id !== app.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create activity log entry
    const { data: activity, error } = await supabase
      .from("activity_log")
      .insert({
        application_id: id,
        event: body.event,
        details: body.details,
      })
      .select()
      .single();

    if (error) throw error;

    // Transform to camelCase
    const transformedActivity = {
      id: activity.id,
      applicationId: activity.application_id,
      timestamp: activity.timestamp,
      event: activity.event,
      details: activity.details,
    };

    return NextResponse.json(transformedActivity, { status: 201 });
  } catch (error) {
    console.error("Error creating activity log entry:", error);
    return NextResponse.json(
      { error: "Failed to create activity log entry" },
      { status: 500 }
    );
  }
}
