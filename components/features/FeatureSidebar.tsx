"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { FeatureTerm } from "@/lib/types";

interface TreeNode extends FeatureTerm {
  children: TreeNode[];
}

function buildTree(categories: FeatureTerm[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (!node.parent || node.parent === 0) roots.push(node);
    else {
      const parent = map.get(node.parent);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

// Vérifie si un slug ou l'un de ses descendants est actif
function containsActive(node: TreeNode, active: string): boolean {
  if (node.slug === active) return true;
  return node.children.some((c) => containsActive(c, active));
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`transition-transform duration-200 shrink-0 ${open ? "rotate-90" : ""}`}
    >
      <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavItem({
  node,
  active,
  depth = 0,
}: {
  node:    TreeNode;
  active:  string;
  depth?:  number;
}) {
  const isActive  = active === node.slug;
  const hasActive = containsActive(node, active);
  const [open, setOpen] = useState(hasActive || depth === 0);

  // Ouvre automatiquement si un enfant devient actif
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const hasChildren = node.children.length > 0;
  const pl = depth === 0 ? "" : depth === 1 ? "pl-3" : "pl-6";

  return (
    <li>
      <div className={`flex items-center group ${pl}`}>
        {/* Lien principal */}
        <Link
          href={`/features?category=${node.slug}`}
          className={`flex-1 flex items-center gap-1.5 py-1.5 px-2 rounded-[var(--radius-md)] text-sm transition-all ${
            isActive
              ? "text-[var(--color-primary)] font-medium bg-[var(--color-primary-light)]"
              : "text-[var(--color-text)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
          } ${isActive ? "border-l-2 border-[var(--color-primary)] rounded-l-none pl-[6px]" : "border-l-2 border-transparent"}`}
        >
          {node.name}
          {node.count !== undefined && node.count > 0 && (
            <span className={`ml-auto text-xs tabular-nums ${isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"}`}>
              {node.count}
            </span>
          )}
        </Link>

        {/* Bouton toggle si enfants */}
        {hasChildren && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label={open ? "Réduire" : "Développer"}
          >
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {/* Enfants */}
      {hasChildren && open && (
        <ul className="mt-0.5 space-y-0.5 border-l border-[var(--color-border)] ml-4">
          {node.children.map((child) => (
            <NavItem key={child.id} node={child} active={active} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FeatureSidebar({ categories }: { categories: FeatureTerm[] }) {
  const searchParams  = useSearchParams();
  const currentCat    = searchParams.get("category") ?? "";
  const tree          = buildTree(categories);

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <nav className="sticky top-24">
        <ul className="space-y-0.5">
          {/* Toutes */}
          <li>
            <Link
              href="/features"
              className={`flex items-center gap-2 py-1.5 px-2 rounded-[var(--radius-md)] text-sm transition-all border-l-2 ${
                !currentCat
                  ? "text-[var(--color-primary)] font-medium bg-[var(--color-primary-light)] border-[var(--color-primary)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface)] border-transparent"
              }`}
            >
              Toutes les fonctionnalités
            </Link>
          </li>

          <li><div className="my-2 border-t border-[var(--color-border)]" /></li>

          {tree.map((root) => (
            <NavItem key={root.id} node={root} active={currentCat} depth={0} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
