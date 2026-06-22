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

    // Activity log — record ALL changes, not just position moves
    const activityEvents: { event: string; details?: string }[] = [];

    // Stage position change
    const beforeStageId: string | null = currentApp.current_stage_id ?? null;
    const beforeRejected: string | null = currentApp.rejected_at_stage_id ?? null;
    if (
      beforeStageId !== result.currentStageId ||
      beforeRejected !== result.rejectedAtStageId
    ) {
      const afterStage = pipeline.stages.find(
        (s) => s.id === result.currentStageId
      );
      if (afterStage?.type === "aggregator" && result.rejectedAtStageId) {
        const source = pipeline.stages.find(
          (s) => s.id === result.rejectedAtStageId
        );
        activityEvents.push({ event: `Marked rejected at ${source?.name ?? "?"}` });
      } else {
        activityEvents.push({ event: `Moved to ${afterStage?.name ?? "?"}` });
      }
    }

    // Stage substatus changes (within same stage)
    const beforeStatuses = currentApp.stage_statuses ?? {};
    for (const [stageId, newVal] of Object.entries(result.stageStatuses)) {
      const oldVal = beforeStatuses[stageId] ?? null;
      if (oldVal !== newVal && newVal !== null && newVal !== "Rejected") {
        const stage = pipeline.stages.find((s) => s.id === stageId);
        if (stage && stage.type === "normal") {
          activityEvents.push({
            event: `${stage.name} status changed`,
            details: `${oldVal ?? "Not Started"} → ${newVal}`,
          });
        }
      }
    }

    // Field changes (from patch_fields)
    if (Object.keys(result.fieldUpdates).length > 0) {
      const fieldLabels: Record<string, string> = {
        rejectionReason: "Rejection reason",
        rejectionComment: "Rejection comment",
        hrName: "HR contact name",
        communicationChannel: "Communication channel",
        contactDetails: "Contact details",
        salary: "Salary",
        conditions: "Conditions",
        notes: "Notes",
        lastContactDate: "Last contact date",
        companyName: "Company name",
        position: "Position",
        url: "Vacancy URL",
      };

      for (const [key, newValue] of Object.entries(result.fieldUpdates)) {
        const label = fieldLabels[key] || key;
        const oldValue = (currentApp as any)[
          key.replace(/([A-Z])/g, "_$1").toLowerCase()
        ];
        // Only log if actually changed
        if (oldValue !== newValue && newValue !== undefined) {
          activityEvents.push({
            event: `${label} updated`,
            details: newValue
              ? String(newValue).length > 80
                ? String(newValue).substring(0, 80) + "..."
                : String(newValue)
              : "Cleared",
          });
        }
      }
    }

    // Write all activity events
    if (activityEvents.length > 0) {
      console.log(`Activity log: writing ${activityEvents.length} events for ${id}:`, activityEvents.map(e => e.event));
      const { error: actErr } = await supabase.from("activity_log").insert(
        activityEvents.map((e) => ({
          application_id: id,
          event: e.event,
          details: e.details ?? null,
        }))
      );
      if (actErr) console.error("Activity log insert error:", actErr.message);
    } else {
      console.log(`Activity log: no changes detected for ${id}`);
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
