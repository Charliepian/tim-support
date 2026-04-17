import Link from "next/link";
import type { FeatureTerm } from "@/lib/types";

interface Props {
  categories:      FeatureTerm[];
  currentCategory: string;
}

function catLink(slug: string, active: string) {
  return `/features${slug ? `?category=${slug}` : ""}`;
}

function isActive(slug: string, current: string) {
  return current === slug;
}

interface TreeNode extends FeatureTerm {
  children: TreeNode[];
}

function buildTree(categories: FeatureTerm[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (!node.parent || node.parent === 0) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent);
      if (parent) parent.children.push(node);
      else roots.push(node); // orphelin → root
    }
  });

  // Tri alphabétique à chaque niveau
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);

  return roots;
}

function CategoryItem({
  node,
  current,
  depth = 0,
}: {
  node:    TreeNode;
  current: string;
  depth?:  number;
}) {
  const active  = isActive(node.slug, current);
  const indent  = depth === 0 ? "" : depth === 1 ? "pl-3" : "pl-6";
  const isRoot  = depth === 0;

  return (
    <li>
      <Link
        href={catLink(node.slug, current)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${indent} ${
          isRoot
            ? active
              ? "text-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold text-xs uppercase tracking-wider"
              : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] font-semibold text-xs uppercase tracking-wider"
            : active
            ? "text-[var(--color-primary)] bg-[var(--color-primary-light)] font-medium text-sm"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface)] text-sm"
        }`}
      >
        <span>{node.name}</span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-xs text-[var(--color-muted)] shrink-0">{node.count}</span>
        )}
      </Link>

      {node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <CategoryItem key={child.id} node={child} current={current} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FeatureSidebar({ categories, currentCategory }: Props) {
  const tree = buildTree(categories);

  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <nav className="sticky top-24">
        <ul className="space-y-0.5">
          {/* Toutes */}
          <li>
            <Link
              href="/features"
              className={`block px-3 py-1.5 rounded-[var(--radius-md)] text-sm transition-colors ${
                !currentCategory
                  ? "bg-[var(--color-primary)] text-white font-medium"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              }`}
            >
              Toutes les fonctionnalités
            </Link>
          </li>

          <li className="pt-2">
            <ul className="space-y-0.5">
              {tree.map((root) => (
                <CategoryItem key={root.id} node={root} current={currentCategory} depth={0} />
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
