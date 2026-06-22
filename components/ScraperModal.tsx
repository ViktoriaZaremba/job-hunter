import { useState } from "react";
import { X, ChevronDown, ChevronUp, Search, Edit2, Plus } from "lucide-react";
import { SearchProfile } from "@/types";

interface Company {
  id: string;
  name: string;
  careersUrl: string;
}

interface ScraperModalProps {
  companies: Company[];
  profiles: SearchProfile[];
  defaultProfileId?: string;
  onStart: (params: { companyIds: string[]; profileId: string }) => void;
  onCreateProfile: () => void;
  onEditProfile: (profile: SearchProfile) => void;
  onClose: () => void;
}

export function ScraperModal({
  companies,
  profiles,
  defaultProfileId,
  onStart,
  onCreateProfile,
  onEditProfile,
  onClose,
}: ScraperModalProps) {
  const initialProfileId =
    defaultProfileId ??
    profiles.find((p) => p.isDefault)?.id ??
    profiles[0]?.id ??
    "";

  const [profileId, setProfileId] = useState(initialProfileId);
  const [companyLimit, setCompanyLimit] = useState(10);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");

  const currentProfile = profiles.find((p) => p.id === profileId);

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearchQuery.toLowerCase())
  );

  const handleStart = () => {
    if (!profileId) return;
    if (selectedCompanies.length > 0) {
      onStart({ companyIds: selectedCompanies, profileId });
    } else {
      const companyIds = companies.slice(0, companyLimit).map((c) => c.id);
      onStart({ companyIds, profileId });
    }
  };

  const willProcess =
    selectedCompanies.length > 0 ? selectedCompanies.length : companyLimit;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl shadow-modal w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-6 pb-3 flex items-center justify-between border-b border-line">
          <div>
            <h2 className="text-h2">Run a search</h2>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Scan watched companies for new vacancies.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-7 py-6 overflow-y-auto space-y-5">
          {/* Search Profile */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
              Search profile
            </label>
            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                {profiles.length === 0 ? (
                  <option value="">No profiles yet</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.isDefault ? " (default)" : ""}
                    </option>
                  ))
                )}
              </select>
              {currentProfile && (
                <button
                  type="button"
                  onClick={() => onEditProfile(currentProfile)}
                  className="btn-secondary"
                  title="Edit profile"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={onCreateProfile}
                className="btn-secondary"
                title="Create profile"
              >
                <Plus size={14} />
                New
              </button>
            </div>
            {currentProfile && (
              <p className="text-[11px] text-text-muted mt-1.5">
                {currentProfile.targetKeywords.length} target ·{" "}
                {currentProfile.preferredKeywords.length} preferred ·{" "}
                {currentProfile.excludedKeywords.length} excluded
              </p>
            )}
          </div>

          {/* Toggle: pick specific companies */}
          <button
            onClick={() => setShowCompanySelector(!showCompanySelector)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-2xl hover:bg-muted/70 transition text-left"
          >
            <div>
              <div className="text-[14px] font-medium text-text-primary">
                {selectedCompanies.length > 0
                  ? `${selectedCompanies.length} companies selected`
                  : "Pick specific companies"}
              </div>
              <div className="text-[12px] text-text-secondary mt-0.5">
                Optional. Skip to use the auto picker below.
              </div>
            </div>
            {showCompanySelector ? (
              <ChevronUp size={18} className="text-text-muted" />
            ) : (
              <ChevronDown size={18} className="text-text-muted" />
            )}
          </button>

          {showCompanySelector && (
            <div className="border border-line rounded-2xl p-4">
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={companySearchQuery}
                  onChange={(e) => setCompanySearchQuery(e.target.value)}
                  className="input pl-9 h-9 text-[13px]"
                />
              </div>

              <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                {filteredCompanies.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center gap-3 px-2 py-1.5 hover:bg-muted rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleCompanySelection(company.id)}
                      className="w-4 h-4 rounded accent-ink"
                    />
                    <span className="text-[13px] text-text-primary">
                      {company.name}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3 flex gap-3 text-[12px]">
                <button
                  onClick={() =>
                    setSelectedCompanies(companies.map((c) => c.id))
                  }
                  className="text-ink hover:text-ink-700 font-medium"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedCompanies([])}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Auto limit (only when nothing selected) */}
          {selectedCompanies.length === 0 && (
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Number of companies (auto pick)
              </label>
              <p className="text-[12px] text-text-muted mb-2">
                {companies.length} companies available
              </p>
              <input
                type="number"
                min={1}
                max={companies.length}
                value={companyLimit}
                onChange={(e) =>
                  setCompanyLimit(
                    Math.min(
                      Math.max(1, parseInt(e.target.value) || 1),
                      companies.length
                    )
                  )
                }
                className="input"
              />
            </div>
          )}

          <div className="bg-muted rounded-2xl px-4 py-3 text-[12px] text-text-secondary">
            About {Math.ceil(willProcess * 0.5)} minutes for {willProcess} companies.
          </div>
        </div>

        <div className="border-t border-line px-7 py-4 flex gap-3 bg-canvas">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!profileId || profiles.length === 0}
            className="btn-primary flex-1"
          >
            <Search size={16} />
            Start search
          </button>
        </div>
      </div>
    </div>
  );
}
