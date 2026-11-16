import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { ProfileProvider } from "@/components/ProfileProvider";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  if (!profile.onboarded) redirect("/onboarding");

  return (
    <ProfileProvider initial={profile}>
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col pb-24">
        {children}
      </div>
      <TabBar />
    </ProfileProvider>
  );
}
