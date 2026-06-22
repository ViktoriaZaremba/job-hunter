import { Application, Pipeline, StageDef } from "@/types";
import { PipelineCard } from "./PipelineCard";
import {
  getStageColor,
  getCardsForAggregatorCell,
  getCardsInStage,
} from "@/lib/pipeline-helpers";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface AggregatorColumnProps {
  stage: StageDef;
  pipeline: Pipeline;
  applications: Application[];
  onCardClick: (app: Application) => void;
}

/**
 * Aggregator column (currently only "Rejected"). Subgroups are generated
 * dynamically from the user's normal stages — one subgroup per source stage.
 *
 * Drop target id format: "aggregator:<aggregatorStageId>:<sourceStageId>".
 * Server then writes stage_statuses[<sourceStageId>] = "Rejected" + forward
 * clearing.
 */
export function AggregatorColumn({
  stage,
  pipeline,
  applications,
  onCardClick,
}: AggregatorColumnProps) {
  const cardsInStage = getCardsInStage(applications, stage.id);
  const dotColor = getStageColor(stage);

  // Source stages = all normal stages with substatuses (skip To-do, skip Offer).
  // Offer is technically normal but rejection from Offer is unusual; include
  // it only if the user has cards rejected there.
  const sourceStages = pipeline.stages
    .filter((s) => s.type === "normal" && s.substatuses.length > 0)
    .filter((s) => s.name !== "Offer")
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex-shrink-0 w-[300px] flex flex-col">
      <div className="px-1 mb-3 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <h2 className="text-[13px] font-semibold text-text-primary uppercase tracking-wide">
          {stage.name}
        </h2>
        <span className="pill bg-muted text-text-secondary">
          {cardsInStage.length}
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {sourceStages.map((source) => {
          const apps = getCardsForAggregatorCell(
            applications,
            stage.id,
            source.id
          );
          const dropId = `aggregator:${stage.id}:${source.id}`;
          return (
            <DropZone key={source.id} id={dropId} apps={apps}>
              <div className="px-1.5 flex items-center gap-2">
                <h3 className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Rejected at {source.name}
                </h3>
                <span className="text-[11px] text-text-muted">{apps.length}</span>
              </div>

              <div className="space-y-2 min-h-[40px]">
                {apps.map((app) => (
                  <PipelineCard
                    key={app.id}
                    application={app}
                    onClick={() => onCardClick(app)}
                  />
                ))}
                {apps.length === 0 && (
                  <div className="text-center text-[11px] text-text-muted py-3 px-3 border border-dashed border-line rounded-xl">
                    Drop here
                  </div>
                )}
              </div>
            </DropZone>
          );
        })}

        {/* Cards rejected at a stage that's not in the source list (edge case
            — for example an "Other"/orphan rejection). Render only when needed. */}
        <OrphanBucket
          aggregatorStageId={stage.id}
          applications={cardsInStage}
          knownSourceIds={sourceStages.map((s) => s.id)}
          onCardClick={onCardClick}
        />
      </div>
    </div>
  );
}

function OrphanBucket({
  aggregatorStageId,
  applications,
  knownSourceIds,
  onCardClick,
}: {
  aggregatorStageId: string;
  applications: Application[];
  knownSourceIds: string[];
  onCardClick: (app: Application) => void;
}) {
  const orphans = applications.filter(
    (app) =>
      !app.rejectedAtStageId || !knownSourceIds.includes(app.rejectedAtStageId)
  );
  if (orphans.length === 0) return null;
  return (
    <DropZone id={`aggregator:${aggregatorStageId}:`} apps={orphans}>
      <div className="px-1.5 flex items-center gap-2">
        <h3 className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          Stage not set
        </h3>
        <span className="text-[11px] text-text-muted">{orphans.length}</span>
      </div>
      <div className="space-y-2 min-h-[40px]">
        {orphans.map((app) => (
          <PipelineCard
            key={app.id}
            application={app}
            onClick={() => onCardClick(app)}
          />
        ))}
      </div>
    </DropZone>
  );
}

function DropZone({
  id,
  apps,
  children,
}: {
  id: string;
  apps: Application[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-1.5 space-y-2 transition
                  ${isOver ? "bg-clay-50 ring-1 ring-clay-100" : "bg-transparent"}`}
    >
      <SortableContext
        items={apps.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </div>
  );
}
