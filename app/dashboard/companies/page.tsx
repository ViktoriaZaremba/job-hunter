"use client";

import { useState, useEffect } from "react";
import { Company } from "@/types";
import {
  Plus,
  Trash2,
  ExternalLink,
  Search,
  X,
  Building2,
  Edit2,
  Check,
} from "lucide-react";

interface CompanyWithMeta extends Company {
  isGlobal?: boolean;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<
    | { kind: "closed" }
    | { kind: "add" }
    | { kind: "edit"; company: CompanyWithMeta }
  >({ kind: "closed" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      // Only user's own companies (not global)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Page header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-h1">My Companies</h1>
          <p className="text-text-secondary mt-1 text-[13px] sm:text-[14px]">
            Companies you added. They appear in the scraper alongside the shared
            pool.
          </p>
        </div>

        <button
          onClick={() => setFormMode({ kind: "add" })}
          className="btn-primary"
        >
          <Plus size={16} />
          Add company
        </button>
      </div>

      {/* Search bar */}
      {companies.length > 0 && (
        <div className="mb-4 sm:mb-5 flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-[400px]">
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
          <span className="text-[13px] text-text-muted hidden sm:block">
            {filteredCompanies.length} of {companies.length}
          </span>
        </div>
      )}

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

      {/* Companies list */}
      {companies.length === 0 ? (
        <EmptyCompanies onAdd={() => setFormMode({ kind: "add" })} />
      ) : filteredCompanies.length === 0 ? (
        <div className="card text-center py-12 text-[13px] text-text-muted">
          No companies match your search
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCompanies.map((company, idx) => (
            <CompanyCard
              key={company.id}
              company={company}
              index={idx + 1}
              onEdit={() => setFormMode({ kind: "edit", company })}
              onDelete={() => handleDelete(company.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Company card (mobile-friendly)
 * ============================================================ */

function CompanyCard({
  company,
  index,
  onEdit,
  onDelete,
}: {
  company: CompanyWithMeta;
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
    <div className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 group hover:border-ink/20 transition">
      <span className="shrink-0 w-7 h-7 rounded-full bg-muted text-text-muted text-[12px] font-semibold inline-flex items-center justify-center tabular-nums">
        {index}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] sm:text-[15px] font-medium text-text-primary truncate">
            {company.name}
          </p>
          {company.domain && (
            <span className="pill bg-ink-50 text-ink-600 text-[10px]">
              {company.domain}
            </span>
          )}
          {company.companyType && (
            <span className="pill bg-teal-50 text-teal-600 text-[10px]">
              {company.companyType}
            </span>
          )}
        </div>
        <a
          href={company.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] sm:text-[13px] text-text-secondary hover:text-ink truncate max-w-full mt-0.5"
        >
          <span className="truncate">{company.careersUrl}</span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-muted transition"
              title="Cancel"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="p-2 rounded-lg text-clay-500 hover:text-clay-600 hover:bg-clay-50 transition"
              title="Confirm delete"
            >
              <Check size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-text-muted hover:text-ink hover:bg-muted transition sm:opacity-0 sm:group-hover:opacity-100"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-text-muted hover:text-clay-500 hover:bg-clay-50 transition sm:opacity-0 sm:group-hover:opacity-100"
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
    <div className="card flex flex-col items-center text-center py-16 sm:py-20 px-6">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Building2 className="text-text-muted" size={26} />
      </div>
      <h3 className="text-h2">Add your first company</h3>
      <p className="text-text-secondary mt-2 max-w-md text-[13px] sm:text-[14px]">
        Add companies you want to track. Their careers pages will be scanned
        for new openings when you run a search.
      </p>
      <button onClick={onAdd} className="btn-primary mt-6">
        <Plus size={16} />
        Add company
      </button>
    </div>
  );
}

/* ============================================================
 * Add / Edit modal
 * ============================================================ */

function CompanyFormModal({
  mode,
  initial,
  onSubmit,
  onClose,
}: {
  mode: "add" | "edit";
  initial?: CompanyWithMeta;
  onSubmit: (data: { name: string; careersUrl: string; domain?: string; companyType?: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initial?.name ?? "",
    careersUrl: initial?.careersUrl ?? "",
    domain: initial?.domain ?? "",
    companyType: initial?.companyType ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.careersUrl.trim()) return;
    onSubmit({
      name: formData.name,
      careersUrl: formData.careersUrl,
      domain: formData.domain.trim() || undefined,
      companyType: formData.companyType.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl sm:rounded-3xl shadow-modal w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-h2">
            {mode === "add" ? "Add company" : "Edit company"}
          </h2>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-5 sm:px-7 pb-5 sm:pb-7 space-y-4"
        >
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Domain
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., AI, SaaS, FinTech"
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Type
              </label>
              <select
                className="input"
                value={formData.companyType}
                onChange={(e) =>
                  setFormData({ ...formData, companyType: e.target.value })
                }
              >
                <option value="">—</option>
                <option value="Product">Product</option>
                <option value="Outsource">Outsource</option>
                <option value="Agency">Agency</option>
                <option value="Startup">Startup</option>
              </select>
            </div>
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
