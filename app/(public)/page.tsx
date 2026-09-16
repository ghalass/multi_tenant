// app/(main)/page.tsx

import DisplayData from "@/components/DisplayData";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { getCurrentUser } from "@/server/auth";
import { getAllTenants } from "@/server/tenants";
import { BadgeCheckIcon, BadgeXIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { CreateTenantForm } from "./create-tenant-form";
import { SpinnerLink } from "@/components/spinner-link";

export default async function HomePage() {
  const { user } = await getCurrentUser();
  const tenants = await getAllTenants();
  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête */}
      {user && user?.id ? (
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Liste de vos tenants ({tenants?.length})
          </h1>
          <CreateTenantForm />
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Description
          </p>
          <div className="flex flex-col gap-2 items-center justify-center mt-2">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/${tenant.id}`}
                className="block w-100"
              >
                <Item variant="outline" size="sm">
                  {tenant?.active ? (
                    <ItemMedia>
                      <BadgeCheckIcon className="size-5 text-blue-400" />
                    </ItemMedia>
                  ) : (
                    <ItemMedia>
                      <BadgeXIcon className="size-5 text-red-400" />
                    </ItemMedia>
                  )}

                  <ItemContent>
                    <ItemTitle>{tenant.name}</ItemTitle>
                  </ItemContent>

                  <SpinnerLink className="size-4" />

                  <ItemActions>
                    by : {tenant?.createdBy?.name}
                    <ChevronRightIcon className="size-4" />
                  </ItemActions>
                </Item>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Bienvenue,
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Veuillez se connecter pour accèder à l'application.
          </p>
        </div>
      )}
    </div>
  );
}
