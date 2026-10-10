import { getHomepageData } from "@/lib/projects/homepage";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProjectsSection } from "@/components/home/HomeProjectsSection";
import { HomeValueSection } from "@/components/home/HomeValueSection";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main className="min-h-screen">
      <HomeHero data={data} />
      <HomeProjectsSection
        projects={data.additionalProjects}
        hasHeroProjects={data.featuredProjects.length > 0}
      />
      <HomeValueSection />
    </main>
  );
}
