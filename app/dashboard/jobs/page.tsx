"use client";

import { useState, useEffect } from "react";
import { Job, SearchProfile } from "@/types";
import {
  ExternalLink,
  Search,
  RefreshCw,
  Plus,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { ScraperModal } from "@/components/ScraperModal";
import { ProfileFormModal } from "@/components/ProfileFormModal";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface Company {
  id: string;
  name: string;
  careersUrl: string;
}

type RelevanceFilter = "all" | "relevant" | "non-relevant";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [relevanceFilter, setRelevanceFilter] =
    useState<RelevanceFilter>("relevant");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  // Profile form modal state
  const [profileForm, setProfileForm] = useState<
    | { kind: "closed" }
    | { kind: "create" }
    | { kind: "edit"; profile: SearchProfile }
  >({ kind: "closed" });

  const [scrapingProgress, setScrapingProgress] = useState({
    current: 0,
    total: 0,
    companyName: "",
    status: "",
    jobsFound: 0,
  });

  useEffect(() => {
    fetchJobs();
    fetchCompanies();
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, relevanceFilter, searchQuery]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkConfirmDelete(false);
  }, [relevanceFilter, searchQuery]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) setJobs(await res.json());
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies?scope=scraper");
      if (res.ok) setCompanies(await res.json());
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/search-profiles");
      if (res.ok) setProfiles(await res.json());
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const startScraping = async ({
    companyIds,
    profileId,
    sources,
  }: {
    companyIds: string[];
    profileId: string;
    sources: { companyPages: boolean; dou: boolean; djinni: boolean };
  }) => {
    if (!sources.companyPages && !sources.dou) {
      alert("Select at least one source");
      return;
    }

    setScraping(true);
    setShowScraperModal(false);
    setScrapingProgress({
      current: 0,
      total: 0,
      companyName: "",
      status: "",
      jobsFound: 0,
    });

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds, profileId, sources }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === "start") {
              setScrapingProgress((prev) => ({ ...prev, total: data.total }));
            } else if (data.type === "progress") {
              setScrapingProgress((prev) => ({
                ...prev,
                current: data.current,
                total: data.total,
                companyName: data.companyName,
                status: data.status === "ai" ? "AI analysis" : "searching",
              }));
            } else if (data.type === "job_found") {
              setScrapingProgress((prev) => ({
                ...prev,
                jobsFound: data.totalFound,
              }));
              fetchJobs();
            }
          } catch (e) {
            console.error("Error parsing SSE:", e);
          }
        }
      }
      fetchJobs();
    } catch (error) {
      console.error("Error scraping:", error);
      alert("Scraper error");
    } finally {
      setScraping(false);
      setScrapingProgress({
        current: 0,
        total: 0,
        companyName: "",
        status: "",
        jobsFound: 0,
      });
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (relevanceFilter === "relevant") {
      filtered = filtered.filter(
        (j) => (j.matchedKeywords?.length ?? 0) > 0 || j.isRelevant
      );
    } else if (relevanceFilter === "non-relevant") {
      filtered = filtered.filter(
        (j) => !((j.matchedKeywords?.length ?? 0) > 0 || j.isRelevant)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.companyName.toLowerCase().includes(query)
      );
    }
    setFilteredJobs(filtered);
  };

  const addToApplications = async (job: Job): Promise<boolean> => {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: job.companyName,
          position: job.title,
          url: job.url,
        }),
      });
      return res.ok;
    } catch (error) {
      console.error("Error adding application:", error);
      return false;
    }
  };

  const deleteJob = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting job:", error);
      return false;
    }
  };

  /* ============================================================
   * Bulk selection helpers
   * ============================================================ */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
    setBulkConfirmDelete(false);
  };

  const allVisibleSelected =
    filteredJobs.length > 0 &&
    filteredJobs.every((j) => selectedIds.has(j.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredJobs.map((j) => j.id)));
    }
    setBulkConfirmDelete(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkConfirmDelete(false);
  };

  /* Bulk delete */
  const bulkDelete = async () => {
    if (bulkBusy || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => !selectedIds.has(j.id)));
        setSelectedIds(new Set());
        setBulkConfirmDelete(false);
      }
    } catch (error) {
      console.error("Error bulk deleting:", error);
    } finally {
      setBulkBusy(false);
    }
  };

  /* Bulk add to applications */
  const bulkAddToApplications = async () => {
    if (bulkBusy || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const selected = filteredJobs.filter((j) => selectedIds.has(j.id));
      await Promise.all(selected.map((job) => addToApplications(job)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk adding:", error);
    } finally {
      setBulkBusy(false);
    }
  };

  /* ============================================================
   * Profile CRUD handlers
   * ============================================================ */

  const handleCreateProfile = async (data: {
    name: string;
    targetKeywords: string[];
    preferredKeywords: string[];
    excludedKeywords: string[];
    isDefault: boolean;
  }) => {
    const res = await fetch("/api/search-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create profile");
    }
    await fetchProfiles();
    setProfileForm({ kind: "closed" });
  };

  const handleUpdateProfile = async (
    id: string,
    data: {
      name: string;
      targetKeywords: string[];
      preferredKeywords: string[];
      excludedKeywords: string[];
      isDefault: boolean;
    }
  ) => {
    const res = await fetch(`/api/search-profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update profile");
    }
    await fetchProfiles();
    setProfileForm({ kind: "closed" });
  };

  const handleDeleteProfile = async (id: string) => {
    const res = await fetch(`/api/search-profiles/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete profile");
    }
    await fetchProfiles();
    setProfileForm({ kind: "closed" });
  };

  if (loading) {
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
          <h1 className="text-h1">Jobs</h1>
          <p className="text-text-secondary mt-1">
            Roles found across the companies you watch.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchJobs}
            disabled={scraping}
            className="btn-secondary"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setShowScraperModal(true)}
            disabled={scraping || profiles.length === 0}
            className="btn-primary"
          >
            <Sparkles size={16} />
            {scraping ? "Searching..." : "Run search"}
          </button>
        </div>
      </div>

      {showScraperModal && (
        <ScraperModal
          companies={companies}
          profiles={profiles}
          onStart={startScraping}
          onCreateProfile={() => setProfileForm({ kind: "create" })}
          onEditProfile={(profile) => setProfileForm({ kind: "edit", profile })}
          onClose={() => setShowScraperModal(false)}
        />
      )}

      {profileForm.kind !== "closed" && (
        <ProfileFormModal
          mode={profileForm.kind}
          profile={profileForm.kind === "edit" ? profileForm.profile : undefined}
          canDelete={profiles.length > 1}
          onSave={(data) => {
            if (profileForm.kind === "create") return handleCreateProfile(data);
            return handleUpdateProfile(profileForm.profile.id, data);
          }}
          onDelete={
            profileForm.kind === "edit"
              ? () => handleDeleteProfile(profileForm.profile.id)
              : undefined
          }
          onClose={() => setProfileForm({ kind: "closed" })}
        />
      )}

      {/* Filters bar */}
      <div className="card p-3 mb-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative md:w-[400px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search by title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <SegmentedFilter
          value={relevanceFilter}
          onChange={setRelevanceFilter}
        />

        <div className="md:ml-auto flex items-center gap-3">
          {/* Select all toggle */}
          {filteredJobs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition"
            >
              {allVisibleSelected ? (
                <CheckSquare size={16} className="text-ink" />
              ) : (
                <Square size={16} />
              )}
              {allVisibleSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          <span className="text-[13px] text-text-muted">
            {filteredJobs.length} of {jobs.length}
          </span>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-ink/5 border border-ink/15 rounded-2xl">
          <span className="text-[13px] font-medium text-text-primary">
            {selectedIds.size} selected
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={bulkAddToApplications}
              disabled={bulkBusy}
              className="btn-secondary"
            >
              <Plus size={14} />
              Add to To-do
            </button>

            {bulkConfirmDelete ? (
              <>
                <span className="text-[12px] text-text-secondary hidden sm:inline">
                  Delete {selectedIds.size} jobs?
                </span>
                <button
                  onClick={() => setBulkConfirmDelete(false)}
                  disabled={bulkBusy}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={bulkBusy}
                  className="btn-danger"
                >
                  <Trash2 size={14} />
                  {bulkBusy ? "Deleting..." : "Delete"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkConfirmDelete(true)}
                disabled={bulkBusy}
                className="btn-ghost text-text-muted hover:text-clay"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}

            <button
              onClick={clearSelection}
              disabled={bulkBusy}
              className="btn-ghost h-9 w-9 p-0 text-text-muted"
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Live progress */}
      {scraping && (
        <div className="card p-5 mb-5 border-ink/15">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
              </span>
              <h3 className="text-[14px] font-semibold text-text-primary">
                Searching for jobs
              </h3>
            </div>
            <span className="text-[13px] text-text-secondary">
              {scrapingProgress.current} / {scrapingProgress.total}
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="bg-ink h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{
                width:
                  scrapingProgress.total > 0
                    ? `${(scrapingProgress.current / scrapingProgress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>

          {scrapingProgress.companyName && (
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <div className="flex items-center gap-2 truncate">
                <span className="text-text-secondary">Company:</span>
                <span className="font-medium text-text-primary truncate">
                  {scrapingProgress.companyName}
                </span>
                <span className="pill bg-ink-50 text-ink-600">
                  {scrapingProgress.status}
                </span>
              </div>
              <div className="text-text-secondary shrink-0">
                Found:{" "}
                <strong className="text-teal-600">
                  {scrapingProgress.jobsFound}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Jobs grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job, idx) => (
            <JobCard
              key={job.id}
              job={job}
              index={idx + 1}
              selected={selectedIds.has(job.id)}
              onToggleSelect={() => toggleSelect(job.id)}
              onAdd={() => addToApplications(job)}
              onDelete={() => deleteJob(job.id)}
            />
          ))}
        </div>
      ) : (
        !scraping && (
          <EmptyJobs
            hasJobs={jobs.length > 0}
            onRunSearch={() => setShowScraperModal(true)}
          />
        )
      )}
    </div>
  );
}

/* ============================================================
 * SegmentedFilter
 * ============================================================ */

function SegmentedFilter({
  value,
  onChange,
}: {
  value: RelevanceFilter;
  onChange: (v: RelevanceFilter) => void;
}) {
  const opts: { id: RelevanceFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "relevant", label: "Relevant only" },
    { id: "non-relevant", label: "Non-relevant" },
  ];

  return (
    <div className="inline-flex items-center bg-muted/60 rounded-xl p-0.5 text-[12px] gap-0.5">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              active
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
 * JobCard
 * ============================================================ */

function JobCard({
  job,
  index,
  selected,
  onToggleSelect,
  onAdd,
  onDelete,
}: {
  job: Job;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onAdd: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [added, setAdded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const matched = job.matchedKeywords ?? [];
  const isRelevant = matched.length > 0 || job.isRelevant;

  const sourceLabel: Record<string, string> = {
    company: "Career page",
    dou: "DOU",
    djinni: "Djinni",
  };

  const handleAdd = async () => {
    if (added || busy) return;
    setBusy(true);
    const ok = await onAdd();
    setBusy(false);
    if (ok) setAdded(true);
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    await onDelete();
  };

  return (
    <div
      className={`card p-5 hover:border-ink/20 transition ${
        selected ? "border-ink/30 bg-ink/[0.02]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1 flex items-start gap-3">
          {/* Checkbox / index badge */}
          <button
            onClick={onToggleSelect}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition hover:bg-muted"
            aria-label={selected ? "Deselect" : "Select"}
          >
            {selected ? (
              <CheckSquare size={16} className="text-ink" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-muted text-text-muted text-[12px] font-semibold inline-flex items-center justify-center tabular-nums">
                {index}
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-text-primary truncate">
              {job.title}
            </h3>
            <p className="text-[14px] text-text-secondary mt-0.5 truncate">
              {job.companyName}
            </p>
            {matched.length > 0 && (
              <p className="text-[12px] text-text-muted mt-1 truncate">
                Matched: {matched.slice(0, 4).join(", ")}
                {matched.length > 4 ? ` +${matched.length - 4}` : ""}
              </p>
            )}
          </div>
        </div>

        {isRelevant && <RelevantBadge matched={matched} />}
        {job.source && job.source !== "company" && (
          <span className="pill bg-ink-50 text-ink-600 shrink-0 text-[11px]">
            {sourceLabel[job.source] ?? job.source}
          </span>
        )}
      </div>

      {job.experience && (
        <p className="text-[13px] text-text-secondary mb-3">
          Experience: {job.experience}
        </p>
      )}

      {job.description && (
        <p className="text-[13px] text-text-secondary line-clamp-2 mb-4">
          {job.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-line gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink hover:text-ink-700 font-medium"
        >
          View vacancy
          <ExternalLink size={14} />
        </a>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="btn-danger"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy || added}
                className="btn-ghost text-text-muted hover:text-clay-500"
                title="Delete job"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={handleAdd}
                className={added ? "btn-secondary" : "btn-primary"}
                disabled={added || busy}
              >
                <Plus size={14} />
                {added ? "Added to To-do" : busy ? "Adding..." : "Add"}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-text-muted mt-3">
        Found{" "}
        {new Date(job.scrapedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
        {" · "}
        {sourceLabel[job.source] ?? "Career page"}
      </p>
    </div>
  );
}

function RelevantBadge({ matched }: { matched: string[] }) {
  const tooltipContent = (
    <div className="text-[12px] leading-relaxed">
      <div className="font-semibold mb-1">Matched keywords</div>
      {matched.length > 0 ? (
        <ul className="list-disc pl-4 space-y-0.5">
          {matched.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      ) : (
        <div className="text-text-muted">Marked relevant by previous scrape</div>
      )}
    </div>
  );

  return (
    <InfoTooltip content={tooltipContent}>
      <span className="pill bg-teal-50 text-teal-600 shrink-0 cursor-help">
        Relevant
      </span>
    </InfoTooltip>
  );
}

function EmptyJobs({
  hasJobs,
  onRunSearch,
}: {
  hasJobs: boolean;
  onRunSearch: () => void;
}) {
  return (
    <div className="card flex flex-col items-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Search className="text-text-muted" size={28} />
      </div>
      <h3 className="text-h2">
        {hasJobs ? "No jobs match your filters" : "No jobs yet"}
      </h3>
      <p className="text-text-secondary mt-2 max-w-md">
        {hasJobs
          ? "Try adjusting search or switching the filter to All."
          : "Run a search to scan your watched companies for new openings."}
      </p>
      {!hasJobs && (
        <button onClick={onRunSearch} className="btn-primary mt-6">
          <Sparkles size={16} />
          Run a search
        </button>
      )}
    </div>
  );
}
