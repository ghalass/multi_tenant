
import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const BACKUP_DIR =
    process.env.GMAO_BACKUP_DIR ?? "C:\\GMAO-Backups";

type RouteContext = {
    params: Promise<{ fileName: string }>;
};

export async function GET(
    _request: Request,
    { params }: RouteContext,
) {
    try {
        const session = await getSession();

        if (!session.userId) {
            return NextResponse.json(
                { message: "Accès réservé au super-administrateur." },
                { status: 403 },
            );
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.userId,
            },
            select: {
                active: true,
                isSuperAdmin: true,
            },
        });

        if (!user?.active || !user.isSuperAdmin) {
            return NextResponse.json(
                { message: "Accès réservé au super-administrateur actif." },
                { status: 403 },
            );
        }

        const { fileName } = await params;

        // Autoriser uniquement les noms d'archives générés par la GMAO.
        if (!/^gmao_[\w.-]+\.dump$/.test(fileName)) {
            return NextResponse.json(
                { message: "Nom de sauvegarde invalide." },
                { status: 400 },
            );
        }

        const root = path.resolve(/*turbopackIgnore: true*/ BACKUP_DIR);
        const filePath = path.resolve(root, fileName);

        if (path.dirname(filePath) !== root) {
            return NextResponse.json(
                { message: "Chemin invalide." },
                { status: 400 },
            );
        }

        const info = await stat(/*turbopackIgnore: true*/ filePath);

        if (!info.isFile() || info.size === 0) {
            return NextResponse.json(
                { message: "Sauvegarde introuvable ou vide." },
                { status: 404 },
            );
        }

        const file = await readFile(/*turbopackIgnore: true*/ filePath);

        return new Response(file, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(file.length),
                "Content-Disposition":
                    `attachment; filename="${fileName}"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Database backup download failed:", error);

        return NextResponse.json(
            { message: "Impossible de télécharger cette sauvegarde." },
            { status: 500 },
        );
    }
}
