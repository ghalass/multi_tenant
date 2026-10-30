import LoginForm from "./login-form";

export default async function LoginPage(): Promise<import("react").JSX.Element> {
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
