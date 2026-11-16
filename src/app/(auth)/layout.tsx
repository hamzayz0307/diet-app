import LangSwitch from "@/components/LangSwitch";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LangSwitch />
        </div>
        {children}
      </div>
    </main>
  );
}
