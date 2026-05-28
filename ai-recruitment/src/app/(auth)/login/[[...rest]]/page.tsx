import { SignIn } from "@clerk/nextjs";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FD] dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <SignIn forceRedirectUrl="/dashboard" />
      </main>
      <Footer />
    </div>
  );
}
