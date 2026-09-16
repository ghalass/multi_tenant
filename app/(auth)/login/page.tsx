import DisplayData from "@/components/DisplayData";
import LoginForm from "./login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center p-4">
      <LoginForm />
      <DisplayData data={session} />
    </div>
  );
}
