import { Suspense } from "react";
import { getFeatureCategories } from "@/lib/wordpress";
import FeatureSidebar from "@/components/features/FeatureSidebar";
import { ActiveCategoryProvider } from "./active-category-context";

export default async function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getFeatureCategories();

  return (
    <ActiveCategoryProvider>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* Sidebar — scroll indépendant */}
        <aside className="w-64 shrink-0 border-r border-border overflow-y-auto bg-white">
          <div className="p-4 pt-6">
            <Suspense>
              <FeatureSidebar categories={categories} />
            </Suspense>
          </div>
        </aside>

        {/* Contenu — scroll indépendant */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>
    </ActiveCategoryProvider>
  );
}
