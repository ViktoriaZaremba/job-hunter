"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/**
 * Free-text tag input. Adds tag on Enter / comma / Tab.
 * Backspace on empty input deletes the last tag.
 */
export function TagsInput({ value, onChange, placeholder }: TagsInputProps) {
  const [input, setInput] = useState("");

  const commit = () => {
    const t = input.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...value, t]);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Tab" && input.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-2xl border border-line bg-surface px-2.5 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-ink/30 transition">
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-muted text-text-primary text-[12px]"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-text-muted hover:text-clay-500 p-0.5 rounded-full hover:bg-clay-50 transition"
            aria-label={`Remove ${tag}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] py-1 px-1 placeholder:text-text-muted"
      />
    </div>
  );
}
