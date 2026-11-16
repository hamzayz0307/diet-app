import { requireProfile } from "@/lib/profile";
import { ProfileProvider } from "@/components/ProfileProvider";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return (
    <ProfileProvider initial={profile}>
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-6">{children}</main>
    </ProfileProvider>
  );
}
