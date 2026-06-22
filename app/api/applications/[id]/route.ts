import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { dbToApplication, applicationToDb } from "@/lib/api-transformers";
import {
  applyOperations,
  Operation,
  ValidationError,
} from "@/lib/pipeline-resolver";
import { fetchPipelineForUser } from "@/lib/pipeline-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = params;

    if (!body || (!body.op && !Array.isArray(body.ops))) {
      return NextResponse.json(
        {
          error:
            "Operation required: send { op, ... } or { ops: [...] } payload",
        },
        { status: 400 }
      );
    }

    const { data: currentApp, error: fetchError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentApp) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const ops: Operation[] = body.ops ?? [body];
    const pipeline = await fetchPipelineForUser(currentApp.user_id);

    const result = applyOperations(
      { stageStatuses: currentApp.stage_statuses ?? {} },
      ops,
      pipeline
    );

    const dbUpdates: any = {
      stage_statuses: result.stageStatuses,
      current_stage_id: result.currentStageId,
      rejected_at_stage_id: result.rejectedAtStageId,
    };
    if (Object.keys(result.fieldUpdates).length > 0) {
      Object.assign(dbUpdates, applicationToDb(result.fieldUpdates));
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from("applications")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Activity log: emit when canonical position changed
    const beforeStageId: string | null = currentApp.current_stage_id ?? null;
    const beforeRejected: string | null = currentApp.rejected_at_stage_id ?? null;
    if (
      beforeStageId !== result.currentStageId ||
      beforeRejected !== result.rejectedAtStageId
    ) {
      const afterStage = pipeline.stages.find(
        (s) => s.id === result.currentStageId
      );
      let event: string;
      if (afterStage?.type === "aggregator" && result.rejectedAtStageId) {
        const source = pipeline.stages.find(
          (s) => s.id === result.rejectedAtStageId
        );
        event = `Marked rejected at ${source?.name ?? "?"}`;
      } else {
        event = `Moved to ${afterStage?.name ?? "?"}`;
      }
      await supabase.from("activity_log").insert({
        application_id: id,
        event,
      });
    }

    return NextResponse.json({
      success: true,
      data: dbToApplication(updatedApp),
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update application" },
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

    const { id } = params;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
