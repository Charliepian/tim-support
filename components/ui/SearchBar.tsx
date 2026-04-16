"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  compact?: boolean;
  defaultValue?: string;
}

export default function SearchBar({ compact, defaultValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un guide, une fonctionnalité..."
        className="w-full h-13 pl-12 pr-4 text-base bg-white border-2 border-[var(--color-border)] rounded-[var(--radius-lg)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm transition"
      />
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition"
      >
        Rechercher
      </button>
    </form>
  );
}
