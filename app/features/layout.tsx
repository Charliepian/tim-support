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
      <div className="flex items-start">

        {/* Sidebar — sticky sous le header (h-16 = top-16), scroll interne
            uniquement si la liste dépasse la hauteur du viewport. */}
        <aside className="w-64 shrink-0 border-r border-border bg-white sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4 pt-6">
            <Suspense>
              <FeatureSidebar categories={categories} />
            </Suspense>
          </div>
        </aside>

        {/* Contenu — flow normal, le scroll appartient à la page (donc le footer
            est atteignable en bas), pas à un sous-conteneur. */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

      </div>
    </ActiveCategoryProvider>
  );
}
