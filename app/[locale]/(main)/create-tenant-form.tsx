"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, PlusIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sleep } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createTenant } from "@/server/tenants";
import DisplayError from "@/components/display-error";
import yup from "@/lib/yupFr";
import { yupResolver } from "@hookform/resolvers/yup";

const formSchema = yup.object({
  name: yup.string().min(1).required(),
});

export function CreateTenantForm({
  className,
  ...props
}: React.ComponentProps<"div">): import("react").JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm<yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    defaultValues: { name: "" },
  });

  const router = useRouter();

  async function onSubmit(values: yup.InferType<typeof formSchema>): Promise<void> {
    try {
      setError("");
      setIsLoading(true);
      await sleep();
      const { success, message } = await createTenant(values?.name);

      if (!success) {
        setError(message);
        return;
      }
      router.refresh();
      toast.success("Tenant created successfully");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
      setError("");
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger className="mx-auto inline-flex items-center justify-center rounded-full bg-primary p-1 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          <PlusIcon className="size-4" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer Tenant</DialogTitle>
            <DialogDescription>
              Créez un nouveau tenant pour commencer
            </DialogDescription>

            <DisplayError error={error} />
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                    </div>
                    <Input
                      {...field}
                      id="name"
                      aria-invalid={fieldState.invalid}
                      placeholder=""
                      autoComplete="off"
                      type="text"
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="sm:justify-start mt-4">
              <Button variant={"outline"} type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
