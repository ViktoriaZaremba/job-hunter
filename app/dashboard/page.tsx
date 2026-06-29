"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Application, Pipeline } from "@/types";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { ApplicationModalFull } from "@/components/pipeline/ApplicationModalFull";
import { BoardWidgets } from "@/components/board/BoardWidgets";
import { Plus, X } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const [appsRes, pipeRes] = await Promise.all([
          fetch("/api/applications"),
          fetch("/api/pipeline"),
        ]);
        if (cancelled) return;
        if (appsRes.ok) {
          const apps = await appsRes.json();
          setApplications(apps);
        }
        if (pipeRes.ok) {
          const pipe = await pipeRes.json();
          setPipeline(pipe);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleUpdate = async (id: string, payload: any) => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { data } = await res.json();
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, ...data } : app))
        );
        if (selectedApp?.id === id) {
          setSelectedApp({ ...selectedApp, ...data });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("PATCH failed:", err);
      }
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
        if (selectedApp?.id === id) setSelectedApp(null);
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };

  const handleDismissFollowup = async (id: string) => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "patch_fields",
          fields: { followupDismissedAt: new Date().toISOString() },
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, ...data } : app))
        );
      }
    } catch (error) {
      console.error("Error dismissing followup:", error);
    }
  };

  const handleAddApplication = async (formData: Partial<Application>) => {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to add application"}`);
        return;
      }
      const newApp = await res.json();
      setApplications((prev) => [...prev, newApp]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding application:", error);
    }
  };

  if (status === "loading" || loading || !pipeline) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-h1">Pipeline</h1>
          <p className="text-text-secondary mt-1">
            Your personal hiring board. Track every conversation in one place.
          </p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          <Plus size={16} />
          Add application
        </button>
      </div>

      {applications.length === 0 ? (
        <EmptyBoard onAdd={() => setShowAddForm(true)} />
      ) : (
        <>
          <BoardWidgets
            applications={applications}
            pipeline={pipeline}
            onCardClick={(app) => setSelectedApp(app)}
            onDismissFollowup={handleDismissFollowup}
          />
          <PipelineBoard
            pipeline={pipeline}
            applications={applications}
            onCardClick={(app) => setSelectedApp(app)}
            onUpdate={handleUpdate}
          />
        </>
      )}

      {showAddForm && (
        <AddApplicationModal
          onAdd={handleAddApplication}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {selectedApp && (
        <ApplicationModalFull
          application={selectedApp}
          pipeline={pipeline}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function EmptyBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card flex flex-col items-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Plus className="text-text-muted" size={28} />
      </div>
      <h3 className="text-h2">No applications yet</h3>
      <p className="text-text-secondary mt-2 max-w-md">
        Add your first application or run a search on the Jobs page to start
        building your pipeline.
      </p>
      <button onClick={onAdd} className="btn-primary mt-6">
        <Plus size={16} />
        Add your first application
      </button>
    </div>
  );
}

function AddApplicationModal({
  onAdd,
  onClose,
}: {
  onAdd: (data: Partial<Application>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    companyName: "",
    position: "",
    url: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.position) {
      alert("Please fill in required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl shadow-modal w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-h2">New application</h2>
          <button
            onClick={onClose}
            className="btn-ghost h-9 w-9 p-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Company <span className="text-clay">*</span>
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., Grammarly"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Position <span className="text-clay">*</span>
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., Senior Project Manager"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Vacancy URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? "Adding..." : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
