"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { SearchProfile } from "@/types";
import { TagsInput } from "./ui/TagsInput";

interface ProfileFormModalProps {
  mode: "create" | "edit";
  profile?: SearchProfile;
  canDelete?: boolean;
  onSave: (data: {
    name: string;
    targetKeywords: string[];
    preferredKeywords: string[];
    excludedKeywords: string[];
    isDefault: boolean;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function ProfileFormModal({
  mode,
  profile,
  canDelete = false,
  onSave,
  onDelete,
  onClose,
}: ProfileFormModalProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [target, setTarget] = useState<string[]>(profile?.targetKeywords ?? []);
  const [preferred, setPreferred] = useState<string[]>(
    profile?.preferredKeywords ?? []
  );
  const [excluded, setExcluded] = useState<string[]>(
    profile?.excludedKeywords ?? []
  );
  const [isDefault, setIsDefault] = useState(profile?.isDefault ?? false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (target.length === 0) {
      setError("Add at least one target keyword");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        targetKeywords: target,
        preferredKeywords: preferred,
        excludedKeywords: excluded,
        isDefault,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || busy) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl shadow-modal w-full max-w-xl my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-6 pb-3 flex items-center justify-between border-b border-line">
          <div>
            <h2 className="text-h2">
              {mode === "create" ? "New search profile" : "Edit search profile"}
            </h2>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Configure how the scraper finds vacancies for you.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* Name */}
          <Field
            label="Profile name"
            required
            description="Used in the scraper modal to pick this profile."
          >
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., AI PM"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          {/* Target */}
          <Field
            label="Target keywords"
            required
            description="A vacancy title must contain at least one of these. Press Enter to add."
          >
            <TagsInput
              value={target}
              onChange={setTarget}
              placeholder="Project Manager, Delivery Manager, ..."
            />
          </Field>

          {/* Preferred */}
          <Field
            label="Preferred keywords"
            description="Optional. Found in title or description, used to mark vacancies as Relevant."
          >
            <TagsInput
              value={preferred}
              onChange={setPreferred}
              placeholder="Remote, AI, SaaS, ..."
            />
          </Field>

          {/* Excluded */}
          <Field
            label="Excluded keywords"
            description="Optional. Vacancies containing these (in title or description) are discarded."
          >
            <TagsInput
              value={excluded}
              onChange={setExcluded}
              placeholder="Junior, On-site, Intern, ..."
            />
          </Field>

          {/* Default */}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded accent-ink"
            />
            <span className="text-[13px] text-text-secondary">
              Make this the default profile
            </span>
          </label>

          {error && (
            <p className="text-[13px] text-clay-500 bg-clay-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-line -mx-7 px-7 mt-6 pt-4">
            {mode === "edit" && onDelete && canDelete && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-[12px] text-text-secondary hidden sm:inline">
                      Delete profile?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="btn-danger"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy}
                    className="btn-ghost text-text-muted hover:text-clay-500 mr-auto"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="btn-secondary ml-auto"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving..." : mode === "create" ? "Create profile" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
        {label}
        {required && <span className="text-clay ml-0.5">*</span>}
      </label>
      {children}
      {description && (
        <p className="text-[11px] text-text-muted mt-1.5">{description}</p>
      )}
    </div>
  );
}
