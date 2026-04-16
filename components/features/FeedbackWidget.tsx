"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/wordpress";

export default function FeedbackWidget({ postId }: { postId: number }) {
  const [choice, setChoice]   = useState<"helpful" | "not_helpful" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent]       = useState(false);

  async function handleVote(helpful: boolean) {
    if (sent) return;
    setChoice(helpful ? "helpful" : "not_helpful");
    if (helpful) {
      await submitFeedback(postId, true);
      setSent(true);
    }
  }

  async function handleSubmitComment() {
    await submitFeedback(postId, false, comment);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-12 pt-6 border-t border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-muted)] text-center">
          Merci pour votre retour !
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 pt-6 border-t border-[var(--color-border)]">
      <p className="text-sm font-medium text-[var(--color-text)] mb-3">
        Cette documentation vous a-t-elle aidé ?
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleVote(true)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[var(--radius-md)] border transition-all ${
            choice === "helpful"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "border-[var(--color-border)] text-[var(--color-text)] hover:border-emerald-300 hover:bg-emerald-50"
          }`}
        >
          👍 Oui
        </button>
        <button
          onClick={() => handleVote(false)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[var(--radius-md)] border transition-all ${
            choice === "not_helpful"
              ? "bg-red-50 border-red-300 text-red-700"
              : "border-[var(--color-border)] text-[var(--color-text)] hover:border-red-300 hover:bg-red-50"
          }`}
        >
          👎 Non
        </button>
      </div>

      {choice === "not_helpful" && (
        <div className="flex flex-col gap-2 max-w-md">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Qu'est-ce qui manque ou n'est pas clair ? (optionnel)"
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          <button
            onClick={handleSubmitComment}
            className="self-start text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Envoyer
          </button>
        </div>
      )}
    </div>
  );
}
