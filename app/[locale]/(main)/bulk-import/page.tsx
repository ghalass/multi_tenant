import BulkImportClient from "./bulk-import-client";

export default async function BulkImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<import("react").JSX.Element> {
  const { locale } = await params;

  return <BulkImportClient locale={locale} />;
}
