"use client";

import { useState, useEffect } from "react";
import { Company } from "@/types";
import {
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Search,
  X,
  Building2,
  Edit2,
  Check,
} from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<
    | { kind: "closed" }
    | { kind: "add" }
    | { kind: "edit"; company: Company }
  >({ kind: "closed" });
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (formData: { name: string; careersUrl: string }) => {
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const newCompany = await res.json();
        setCompanies((prev) =>
          [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name))
        );
        setFormMode({ kind: "closed" });
      }
    } catch (error) {
      console.error("Error adding company:", error);
    }
  };

  const handleEdit = async (
    id: string,
    formData: { name: string; careersUrl: string }
  ) => {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompanies((prev) =>
          prev
            .map((c) => (c.id === id ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setFormMode({ kind: "closed" });
      }
    } catch (error) {
      console.error("Error updating company:", error);
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting company:", error);
      return false;
    }
  };

  const handleScrapeAll = async () => {
    setScraping(true);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: companies.map((c) => c.id) }),
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Found ${result.jobsFound} new vacancies`);
      }
    } catch (error) {
      console.error("Error scraping:", error);
      alert("Scraper error");
    } finally {
      setScraping(false);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-h1">Companies</h1>
          <p className="text-text-secondary mt-1">
            The companies you watch for new openings.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleScrapeAll}
            disabled={scraping || companies.length === 0}
            className="btn-secondary"
          >
            <RefreshCw size={16} className={scraping ? "animate-spin" : ""} />
            {scraping ? "Scraping..." : "Run scraper"}
          </button>
          <button
            onClick={() => setFormMode({ kind: "add" })}
            className="btn-primary"
          >
            <Plus size={16} />
            Add company
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="relative md:w-[400px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <span className="text-[13px] text-text-muted">
          {filteredCompanies.length} of {companies.length}
        </span>
      </div>

      {formMode.kind !== "closed" && (
        <CompanyFormModal
          mode={formMode.kind}
          initial={formMode.kind === "edit" ? formMode.company : undefined}
          onSubmit={(data) => {
            if (formMode.kind === "add") handleAdd(data);
            else handleEdit(formMode.company.id, data);
          }}
          onClose={() => setFormMode({ kind: "closed" })}
        />
      )}

      {/* Companies table / list */}
      {companies.length === 0 ? (
        <EmptyCompanies onAdd={() => setFormMode({ kind: "add" })} />
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[40px_1fr_2fr_120px] gap-4 px-6 py-3 border-b border-line bg-muted/40">
            <div className="text-[12px] font-medium text-text-secondary uppercase tracking-wider">
              #
            </div>
            <div className="text-[12px] font-medium text-text-secondary uppercase tracking-wider">
              Company
            </div>
            <div className="text-[12px] font-medium text-text-secondary uppercase tracking-wider">
              Careers URL
            </div>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-line">
            {filteredCompanies.map((company, idx) => (
              <CompanyRow
                key={company.id}
                company={company}
                index={idx + 1}
                onEdit={() => setFormMode({ kind: "edit", company })}
                onDelete={() => handleDelete(company.id)}
              />
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12 text-[13px] text-text-muted">
              No companies match your search
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Row
 * ============================================================ */

function CompanyRow({
  company,
  index,
  onEdit,
  onDelete,
}: {
  company: Company;
  index: number;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    await onDelete();
  };

  return (
    <div className="md:grid md:grid-cols-[40px_1fr_2fr_120px] gap-4 px-6 py-4 items-center hover:bg-muted/40 transition group">
      <div className="text-[12px] text-text-muted tabular-nums">
        {index}
      </div>
      <div className="text-[14px] font-medium text-text-primary truncate">
        {company.name}
      </div>
      <div className="min-w-0">
        <a
          href={company.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-ink truncate max-w-full"
        >
          <span className="truncate">{company.careersUrl}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      </div>
      <div className="flex justify-end items-center gap-1">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="text-text-muted hover:text-text-primary transition p-2 rounded-lg hover:bg-muted"
              title="Cancel"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="text-clay-500 hover:text-clay-600 transition p-2 rounded-lg hover:bg-clay-50"
              title="Confirm delete"
            >
              <Check size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="text-text-muted hover:text-ink transition p-2 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-text-muted hover:text-clay-500 transition p-2 rounded-lg hover:bg-clay-50 opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Empty state
 * ============================================================ */

function EmptyCompanies({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card flex flex-col items-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Building2 className="text-text-muted" size={28} />
      </div>
      <h3 className="text-h2">Add your first company</h3>
      <p className="text-text-secondary mt-2 max-w-md">
        Add the companies you would like to track. The scraper checks their
        careers pages for new openings.
      </p>
      <button onClick={onAdd} className="btn-primary mt-6">
        <Plus size={16} />
        Add company
      </button>
    </div>
  );
}

/* ============================================================
 * Add / Edit modal — same shape, different titles + button labels
 * ============================================================ */

function CompanyFormModal({
  mode,
  initial,
  onSubmit,
  onClose,
}: {
  mode: "add" | "edit";
  initial?: Company;
  onSubmit: (data: { name: string; careersUrl: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initial?.name ?? "",
    careersUrl: initial?.careersUrl ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.careersUrl.trim()) return;
    onSubmit(formData);
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
          <h2 className="text-h2">
            {mode === "add" ? "Add company" : "Edit company"}
          </h2>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Company name <span className="text-clay">*</span>
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., Grammarly"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Careers URL <span className="text-clay">*</span>
            </label>
            <input
              type="url"
              required
              className="input"
              placeholder="https://company.com/careers"
              value={formData.careersUrl}
              onChange={(e) =>
                setFormData({ ...formData, careersUrl: e.target.value })
              }
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
