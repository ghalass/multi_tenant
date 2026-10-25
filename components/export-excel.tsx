"use client";

import { exportExcel } from "@/lib/xlsxFn";
import { SaveIcon } from "lucide-react";
import { Spinner } from "./ui/spinner";
import { useState } from "react";
import { sleep } from "@/lib/utils";

export function ExportExcel({ tableName, fileName }: { tableName: string; fileName: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async () => {
        setIsLoading(true);

        // Laisse React afficher le spinner pendant au moins 300 ms
        await sleep();
        try {
            exportExcel(tableName, fileName);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {isLoading ? (
                <Spinner className="size-4" />
            ) : (
                <SaveIcon
                    className="size-6 text-primary hover:cursor-pointer"
                    onClick={handleExport}
                />
            )}
        </div>
    );
}