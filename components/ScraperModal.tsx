import { useState } from "react";
import { X, ChevronDown, ChevronUp, Search, Edit2, Plus } from "lucide-react";
import { SearchProfile } from "@/types";

interface Company {
  id: string;
  name: string;
  careersUrl: string;
}

interface Sources {
  companyPages: boolean;
  dou: boolean;
  djinni: boolean;
}

interface ScraperModalProps {
  companies: Company[];
  profiles: SearchProfile[];
  defaultProfileId?: string;
  onStart: (params: {
    companyIds: string[];
    profileId: string;
    sources: Sources;
  }) => void;
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
  const [sources, setSources] = useState<Sources>({
    companyPages: true,
    dou: true,
    djinni: false,
  });
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
    const companyIds = sources.companyPages ? selectedCompanies : [];
    if (sources.companyPages && companyIds.length === 0 && !sources.dou) {
      return; // nothing to do
    }
    onStart({ companyIds, profileId, sources });
  };

  const canStart =
    profileId &&
    (sources.dou || (sources.companyPages && selectedCompanies.length > 0));

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
              Scan for new vacancies using your search profile.
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
                </button>
              )}
              <button
                type="button"
                onClick={onCreateProfile}
                className="btn-secondary"
                title="Create profile"
              >
                <Plus size={14} />
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

          {/* Sources */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">
              Sources
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sources.companyPages}
                  onChange={(e) =>
                    setSources({ ...sources, companyPages: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-ink"
                />
                <span className="text-[14px] text-text-primary">
                  Company career pages
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sources.dou}
                  onChange={(e) =>
                    setSources({ ...sources, dou: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-ink"
                />
                <span className="text-[14px] text-text-primary">DOU</span>
              </label>
              <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="w-4 h-4 rounded"
                />
                <span className="text-[14px] text-text-muted">
                  Djinni
                  <span className="ml-2 pill bg-muted text-text-muted text-[10px]">
                    Coming soon
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Company selection — only if companyPages is on */}
          {sources.companyPages && (
            <>
              <button
                onClick={() => setShowCompanySelector(!showCompanySelector)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-2xl hover:bg-muted/70 transition text-left"
              >
                <div>
                  <div className="text-[14px] font-medium text-text-primary">
                    {selectedCompanies.length > 0
                      ? `${selectedCompanies.length} companies selected`
                      : "Select companies"}
                  </div>
                  <div className="text-[12px] text-text-secondary mt-0.5">
                    Pick which companies to scan.
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
            </>
          )}
        </div>

        <div className="border-t border-line px-7 py-4 flex gap-3 bg-canvas">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
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
