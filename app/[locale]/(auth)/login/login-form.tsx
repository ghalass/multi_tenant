"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import Link from "next/link";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import yup from "@/lib/yupFr";
import { yupResolver } from "@hookform/resolvers/yup";

const formSchema = yup.object({
  email: yup.string().min(8).required().label("Email"),
  password: yup.string().min(6).required().label("Mot de passe"),
});

export default function LoginForm() {
  const [isSubmitting, setisSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });
  async function onSubmit(values: yup.InferType<typeof formSchema>) {
    setisSubmitting(true);
    setError(null);
    try {
      const { success, message } = await login(values.email, values.password);

      if (success) {
        toast.success(message);
        router.push("/");
      } else {
        setError(message);
        // toast.error(message);
      }
    } catch (error) {
    } finally {
      setisSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Se connecter</CardTitle>
        <CardDescription className="text-center">
          Entrez vos identifiants pour accéder à votre compte.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="m@example.com"
                    disabled={isSubmitting}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    placeholder=""
                    disabled={isSubmitting}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        {error && (
          <div className="mt-2 p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="text-center space-y-2 text-sm">
          <p className="text-muted-foreground">
            <Link href="/" className="text-primary hover:underline font-medium">
              Retour à la page d&apos;accueil
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
