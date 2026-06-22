import { Application, StageDef } from "@/types";
import { PipelineCard } from "./PipelineCard";
import {
  getStageColor,
  getCardsForCell,
  getCardsInStage,
} from "@/lib/pipeline-helpers";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface NormalColumnProps {
  stage: StageDef;
  applications: Application[];
  onCardClick: (app: Application) => void;
}

/**
 * Single component for any normal stage:
 *   - With substatuses → grouped subgroups (Resume / HR / Tech / Final / Offer)
 *   - Without substatuses → flat list (To-do)
 *
 * Drop targets use id format "normal:<stageId>:<substatusId|empty>".
 */
export function NormalColumn({
  stage,
  applications,
  onCardClick,
}: NormalColumnProps) {
  const cardsInStage = getCardsInStage(applications, stage.id);
  const dotColor = getStageColor(stage);

  return (
    <div className="flex-shrink-0 w-[300px] flex flex-col">
      {/* Column header */}
      <div className="px-1 mb-3 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <h2 className="text-[13px] font-semibold text-text-primary uppercase tracking-wide">
          {stage.name}
        </h2>
        <span className="pill bg-muted text-text-secondary">
          {cardsInStage.length}
        </span>
      </div>

      {stage.substatuses.length === 0 ? (
        <FlatBody
          stageId={stage.id}
          applications={cardsInStage}
          onCardClick={onCardClick}
        />
      ) : (
        <GroupedBody
          stage={stage}
          applications={applications}
          onCardClick={onCardClick}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Flat body — used by stages without substatuses (e.g. To-do).
 * ============================================================ */

function FlatBody({
  stageId,
  applications,
  onCardClick,
}: {
  stageId: string;
  applications: Application[];
  onCardClick: (app: Application) => void;
}) {
  const dropId = `normal:${stageId}:`;
  return (
    <DropZone id={dropId} apps={applications}>
      <div className="space-y-2 min-h-[80px]">
        {applications.map((app) => (
          <PipelineCard
            key={app.id}
            application={app}
            onClick={() => onCardClick(app)}
          />
        ))}
        {applications.length === 0 && (
          <div className="text-center text-[11px] text-text-muted py-3 px-3 border border-dashed border-line rounded-xl">
            Drop here
          </div>
        )}
      </div>
    </DropZone>
  );
}

/* ============================================================
 * Grouped body — used by stages with substatuses.
 * ============================================================ */

function GroupedBody({
  stage,
  applications,
  onCardClick,
}: {
  stage: StageDef;
  applications: Application[];
  onCardClick: (app: Application) => void;
}) {
  return (
    <div className="flex-1 space-y-3">
      {stage.substatuses.map((sub) => {
        const apps = getCardsForCell(applications, stage.id, sub.name);
        const dropId = `normal:${stage.id}:${sub.id}`;
        return (
          <DropZone key={sub.id} id={dropId} apps={apps}>
            <div className="px-1.5 flex items-center gap-2">
              <h3 className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                {sub.name}
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
    </div>
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
                  ${isOver ? "bg-ink-50/60 ring-1 ring-ink/10" : "bg-transparent"}`}
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
