"use client";

import { useState } from "react";
import { MessageSquare, X, Bug, Lightbulb, MessageCircle, Send, CheckCircle } from "lucide-react";
import { usePathname } from "next/navigation";

type FeedbackType = "bug" | "feature" | "other";

interface TypeOption {
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "bug",
    label: "Bug",
    icon: <Bug size={15} />,
    description: "Something isn't working",
  },
  {
    value: "feature",
    label: "Feature idea",
    icon: <Lightbulb size={15} />,
    description: "Suggest an improvement",
  },
  {
    value: "other",
    label: "Other",
    icon: <MessageCircle size={15} />,
    description: "Anything else",
  },
];

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setSent(false);
    setError(null);
    setMessage("");
    setType("bug");
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !message.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), page: pathname }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send");
      }

      setSent(true);
      setMessage("");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 h-10 px-4 bg-ink text-white rounded-full shadow-lg hover:bg-ink/90 active:scale-95 transition-all text-sm font-medium select-none"
        aria-label="Send feedback"
      >
        <MessageSquare size={15} />
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={handleClose}
        >
          <div
            className="bg-surface rounded-3xl shadow-modal w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-line">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-text-primary">
                  Send feedback
                </h2>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  Bugs, ideas, or anything else — we read it all.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={busy}
                className="btn-ghost h-9 w-9 p-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {sent ? (
              /* Success state */
              <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
                  <CheckCircle size={24} className="text-teal" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-text-primary">
                    Thanks for the feedback!
                  </p>
                  <p className="text-[13px] text-text-secondary mt-1">
                    We&apos;ll take a look and get back to you if needed.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="btn-secondary mt-2"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center transition ${
                          type === opt.value
                            ? "border-ink/40 bg-ink/5 text-text-primary"
                            : "border-line bg-surface text-text-secondary hover:bg-muted hover:border-line"
                        }`}
                      >
                        <span
                          className={
                            type === opt.value
                              ? "text-ink"
                              : "text-text-muted"
                          }
                        >
                          {opt.icon}
                        </span>
                        <span className="text-[12px] font-medium leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                    Message
                  </label>
                  <textarea
                    className="input min-h-[110px] text-[14px]"
                    placeholder={
                      type === "bug"
                        ? "Describe what happened and how to reproduce it..."
                        : type === "feature"
                        ? "What would you like to see? How would it help you?"
                        : "What's on your mind?"
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-clay bg-clay/8 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-text-muted">
                    Page:{" "}
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {pathname}
                    </span>
                  </p>
                  <button
                    type="submit"
                    disabled={busy || !message.trim()}
                    className="btn-primary gap-1.5"
                  >
                    <Send size={14} />
                    {busy ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
