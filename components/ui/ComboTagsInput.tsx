"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

interface ComboTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

/**
 * Combo tags input: dropdown of existing options + free-text entry.
 * - Click dropdown to pick from suggestions
 * - Type and press Enter to add custom value
 * - Custom values are added to suggestions for future use
 */
export function ComboTagsInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: ComboTagsInputProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
    setInput("");
    setShowDropdown(false);
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Filter suggestions: not already selected, matches input
  const filtered = suggestions.filter(
    (s) =>
      !value.some((v) => v.toLowerCase() === s.toLowerCase()) &&
      s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        className="rounded-2xl border border-line bg-surface px-2.5 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-ink/30 transition cursor-text"
        onClick={() => setShowDropdown(true)}
      >
        {value.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-ink-50 text-ink-600 text-[12px]"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="text-ink-400 hover:text-clay-500 p-0.5 rounded-full hover:bg-clay-50 transition"
              aria-label={`Remove ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="flex-1 min-w-[100px] flex items-center gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKey}
            onFocus={() => setShowDropdown(true)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 bg-transparent outline-none text-[13px] py-1 placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="text-text-muted hover:text-text-secondary p-0.5"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (filtered.length > 0 || input.trim()) && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-line rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-[13px] text-text-primary hover:bg-muted transition"
            >
              {s}
            </button>
          ))}
          {input.trim() &&
            !suggestions.some(
              (s) => s.toLowerCase() === input.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onClick={() => addTag(input)}
                className="w-full text-left px-3 py-2 text-[13px] text-teal-600 hover:bg-teal-50 transition border-t border-line"
              >
                + Add &ldquo;{input.trim()}&rdquo;
              </button>
            )}
        </div>
      )}
    </div>
  );
}
