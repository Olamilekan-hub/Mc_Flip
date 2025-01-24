import { redirect } from "next/navigation";
import DashboardHeader from "~/components/dashboard-header";
import { auth } from "~/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user) {
      return redirect("/");
    }
  
    return <div className="min-h-screen bg-background text-foreground dark">
      <DashboardHeader />
      
      {children}
    </div>
}
