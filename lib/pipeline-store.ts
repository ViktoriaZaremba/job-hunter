/**
 * Pipeline store — load a user's pipeline configuration from Supabase.
 *
 * The pipeline is seeded automatically on user creation (DB trigger
 * `users_seed_pipeline` from migration 001). Each user has exactly one row.
 */

import { supabase } from "@/lib/supabase";
import { Pipeline, StageDef } from "@/types";

export async function fetchPipelineForUser(userId: string): Promise<Pipeline> {
  const { data: pipelineRow, error: pErr } = await supabase
    .from("pipelines")
    .select("id, user_id")
    .eq("user_id", userId)
    .single();

  if (pErr || !pipelineRow) {
    throw new Error(
      `Pipeline not found for user ${userId}: ${pErr?.message ?? "no row"}`
    );
  }

  const { data: stageRows, error: sErr } = await supabase
    .from("pipeline_stages")
    .select("id, name, order_idx, type, aggregator_of")
    .eq("pipeline_id", pipelineRow.id)
    .order("order_idx", { ascending: true });

  if (sErr) throw sErr;

  const stageIds = (stageRows ?? []).map((s) => s.id);
  const { data: subRows, error: ssErr } = await supabase
    .from("pipeline_substatuses")
    .select("id, stage_id, name, order_idx, closes_process")
    .in("stage_id", stageIds.length > 0 ? stageIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_idx", { ascending: true });

  if (ssErr) throw ssErr;

  const subsByStage = new Map<string, typeof subRows>();
  for (const row of subRows ?? []) {
    const list = subsByStage.get(row.stage_id) ?? [];
    list.push(row);
    subsByStage.set(row.stage_id, list);
  }

  const stages: StageDef[] = (stageRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order_idx,
    type: s.type as "normal" | "aggregator",
    aggregatorOf: (s.aggregator_of ?? undefined) as "rejection" | undefined,
    substatuses: (subsByStage.get(s.id) ?? []).map((ss) => ({
      id: ss.id,
      name: ss.name,
      order: ss.order_idx,
      closesProcess: ss.closes_process,
    })),
  }));

  return {
    id: pipelineRow.id,
    userId: pipelineRow.user_id,
    stages,
  };
}

export async function fetchPipelineForEmail(email: string): Promise<Pipeline> {
  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !user) throw new Error(`User not found: ${email}`);
  return fetchPipelineForUser(user.id);
}
