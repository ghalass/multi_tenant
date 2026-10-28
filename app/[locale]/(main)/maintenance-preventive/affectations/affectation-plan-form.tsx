"use client";

import {
    useState,
    type FormEvent,
    type ReactElement,
} from "react"; import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { PorteeAffectationMaintenance } from "@/lib/generated/prisma/enums";
import { createAffectationPlanMaintenance } from "@/server/maintenance-preventive-affectations";

type AffectationOptions = {
    plans: {
        id: string;
        code: string;
        name: string;
    }[];
    typeparcs: {
        id: string;
        name: string;
    }[];
    parcs: {
        id: string;
        name: string;
        typeparcId: string;
    }[];
    sites: {
        id: string;
        name: string;
    }[];
    engins: {
        id: string;
        name: string;
        parcId: string;
        siteId: string;
    }[];
};

type Props = {
    options: AffectationOptions;
};

type TargetOption = {
    id: string;
    label: string;
};

export function AffectationPlanForm({
    options,
}: Props): ReactElement {
    const router = useRouter();

    const [planMaintenanceId, setPlanMaintenanceId] = useState("");
    const [portee, setPortee] =
        useState<PorteeAffectationMaintenance>(
            PorteeAffectationMaintenance.TYPEPARC,
        );
    const [targetId, setTargetId] = useState("");
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const typeparcNames = new Map(
        options.typeparcs.map((item) => [item.id, item.name]),
    );

    const parcNames = new Map(
        options.parcs.map((item) => [item.id, item.name]),
    );

    const targetOptions: TargetOption[] = ((): TargetOption[] => {
        switch (portee) {
            case PorteeAffectationMaintenance.TYPEPARC:
                return options.typeparcs.map((item) => ({
                    id: item.id,
                    label: item.name,
                }));

            case PorteeAffectationMaintenance.PARC:
                return options.parcs.map((item) => ({
                    id: item.id,
                    label: `${item.name} — ${typeparcNames.get(item.typeparcId) ?? "Type inconnu"
                        }`,
                }));

            case PorteeAffectationMaintenance.SITE:
                return options.sites.map((item) => ({
                    id: item.id,
                    label: item.name,
                }));

            case PorteeAffectationMaintenance.ENGIN:
                return options.engins.map((item) => ({
                    id: item.id,
                    label: `${item.name} — ${parcNames.get(item.parcId) ?? "Parc inconnu"
                        }`,
                }));

            default:
                return [];
        }
    })();

    function handlePorteeChange(value: string): void {
        setPortee(value as PorteeAffectationMaintenance);
        setTargetId("");
        setFeedback(null);
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setFeedback(null);

        if (!planMaintenanceId || !targetId) {
            setFeedback({
                success: false,
                message: "Sélectionnez un plan et une cible.",
            });
            return;
        }

        setPending(true);

        try {
            const result = await createAffectationPlanMaintenance({
                planMaintenanceId,
                portee,
                typeparcId:
                    portee === PorteeAffectationMaintenance.TYPEPARC
                        ? targetId
                        : null,
                parcId:
                    portee === PorteeAffectationMaintenance.PARC
                        ? targetId
                        : null,
                siteId:
                    portee === PorteeAffectationMaintenance.SITE
                        ? targetId
                        : null,
                enginId:
                    portee === PorteeAffectationMaintenance.ENGIN
                        ? targetId
                        : null,
            });

            setFeedback({
                success: result.success,
                message: result.message,
            });

            if (result.success) {
                setTargetId("");
                router.refresh();
            }
        } catch {
            setFeedback({
                success: false,
                message: "Une erreur est survenue lors de la création.",
            });
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Portée de l&apos;affectation
                    </label>

                    <Select
                        value={planMaintenanceId || undefined}
                        onValueChange={setPlanMaintenanceId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un plan" />
                        </SelectTrigger>

                        <SelectContent>
                            {options.plans.map((plan) => (
                                <SelectItem
                                    key={plan.id}
                                    value={plan.id}
                                >
                                    {plan.code} — {plan.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {options.plans.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            Aucun plan actif disponible.
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Portée de l&apos;affectation
                    </label>

                    <Select
                        value={portee}
                        onValueChange={handlePorteeChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choisir la portée" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem
                                value={PorteeAffectationMaintenance.TYPEPARC}
                            >
                                Type de parc
                            </SelectItem>

                            <SelectItem
                                value={PorteeAffectationMaintenance.PARC}
                            >
                                Parc
                            </SelectItem>

                            <SelectItem
                                value={PorteeAffectationMaintenance.SITE}
                            >
                                Site
                            </SelectItem>

                            <SelectItem
                                value={PorteeAffectationMaintenance.ENGIN}
                            >
                                Engin
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Cible
                    </label>

                    <Select
                        value={targetId || undefined}
                        onValueChange={setTargetId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une cible" />
                        </SelectTrigger>

                        <SelectContent>
                            {targetOptions.map((target) => (
                                <SelectItem
                                    key={target.id}
                                    value={target.id}
                                >
                                    {target.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {targetOptions.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            Aucune cible disponible pour cette portée.
                        </p>
                    )}
                </div>
            </div>

            {feedback && (
                <p
                    role="status"
                    className={
                        feedback.success
                            ? "text-sm text-green-600"
                            : "text-sm text-destructive"
                    }
                >
                    {feedback.message}
                </p>
            )}

            <Button
                type="submit"
                disabled={
                    pending ||
                    !planMaintenanceId ||
                    !targetId ||
                    options.plans.length === 0
                }
            >
                {pending ? "Enregistrement..." : "Créer l'affectation"}
            </Button>
        </form>
    );
}