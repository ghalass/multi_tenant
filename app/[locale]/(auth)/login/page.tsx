import LoginForm from "./login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
