import { Application } from "@/types";
import { getBusinessDaysSinceContact } from "@/lib/pipeline-helpers";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight } from "lucide-react";

interface PipelineCardProps {
  application: Application;
  onClick: () => void;
}

/**
 * Compact card for the Pipeline Board.
 * Click to open details. Click + drag (10px threshold) to reorder.
 */
export function PipelineCard({ application, onClick }: PipelineCardProps) {
  const daysSinceContact = application.lastContactDate
    ? getBusinessDaysSinceContact(application.lastContactDate)
    : 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group bg-surface border border-line rounded-2xl p-3.5
                 hover:border-ink/20 hover:shadow-card transition cursor-pointer"
    >
      {/* Company Name */}
      <h3 className="text-[14px] font-semibold text-text-primary truncate leading-tight">
        {application.companyName}
      </h3>

      {/* Position */}
      <p className="text-[13px] text-text-secondary truncate mt-1">
        {application.position}
      </p>

      {/* Footer line */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-text-muted">
          {daysSinceContact > 0
            ? `${daysSinceContact} business day${daysSinceContact !== 1 ? "s" : ""} since contact`
            : "No contact yet"}
        </span>

        <span
          className="inline-flex items-center gap-1 text-[12px] font-medium
                     text-text-muted group-hover:text-ink transition"
        >
          Open
          <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
}
