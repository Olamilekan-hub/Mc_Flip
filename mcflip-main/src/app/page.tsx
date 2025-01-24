import { redirect } from "next/navigation";
import { LoginRegisterCard } from "~/components/login-register-card";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    return redirect("/dashboard");
  }

  return <LoginRegisterCard />;
}
