"use client";

import { Application, Pipeline } from "@/types";
import { NormalColumn } from "./NormalColumn";
import { AggregatorColumn } from "./AggregatorColumn";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import { PipelineCard } from "./PipelineCard";

interface PipelineBoardProps {
  pipeline: Pipeline;
  applications: Application[];
  onCardClick: (app: Application) => void;
  onUpdate: (id: string, payload: any) => void;
}

/**
 * Renders the user's pipeline as a board. One column per stage, in order.
 *
 * Drag-and-drop semantics — see Requirements R-DRAG-1..6:
 *   - Drop into normal stage Y / substatus Z → set_stage_status (server
 *     applies forward-clearing).
 *   - Drop into aggregator stage Y / source S → move_to_aggregator (server
 *     writes stage_statuses[S] = "Rejected" + forward-clearing).
 *
 * PointerSensor.activationConstraint.distance: 10 px so a plain click
 * opens the modal instead of starting a drag.
 */
export function PipelineBoard({
  pipeline,
  applications,
  onCardClick,
  onUpdate,
}: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const draggedApp = applications.find((app) => app.id === active.id);
    if (!draggedApp) return;

    const overId = String(over.id);
    const [kind, ...rest] = overId.split(":");

    if (kind === "normal") {
      const [stageId, substatusId] = rest;
      const targetStage = pipeline.stages.find((s) => s.id === stageId);
      if (!targetStage) return;

      const targetSub = substatusId
        ? targetStage.substatuses.find((s) => s.id === substatusId)
        : undefined;

      // No-op if dropping into the same cell
      if (
        draggedApp.currentStageId === stageId &&
        (draggedApp.stageStatuses?.[stageId] ?? null) === (targetSub?.name ?? null)
      ) {
        return;
      }

      onUpdate(draggedApp.id, {
        op: "set_stage_status",
        stageId,
        substatus: targetSub?.name ?? null,
      });
      return;
    }

    if (kind === "aggregator") {
      const [aggregatorStageId, sourceStageId] = rest;
      if (!sourceStageId) return; // orphan bucket — sourceStageId is empty

      // No-op if already in this aggregator subgroup
      if (
        draggedApp.currentStageId === aggregatorStageId &&
        draggedApp.rejectedAtStageId === sourceStageId
      ) {
        return;
      }

      onUpdate(draggedApp.id, {
        op: "move_to_aggregator",
        aggregatorStageId,
        sourceStageId,
      });
      return;
    }
  };

  const activeApp = activeId
    ? applications.find((app) => app.id === activeId)
    : null;

  // Render columns in pipeline order
  const orderedStages = [...pipeline.stages].sort((a, b) => a.order - b.order);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin -mx-2 px-2">
        {orderedStages.map((stage) =>
          stage.type === "aggregator" ? (
            <AggregatorColumn
              key={stage.id}
              stage={stage}
              pipeline={pipeline}
              applications={applications}
              onCardClick={onCardClick}
            />
          ) : (
            <NormalColumn
              key={stage.id}
              stage={stage}
              applications={applications}
              onCardClick={onCardClick}
            />
          )
        )}
      </div>

      <DragOverlay>
        {activeApp ? (
          <div className="opacity-90 rotate-1">
            <PipelineCard application={activeApp} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
