import IndependentBatchImportClient from "@/components/independent-batch-import-client";

export default async function IndependentBatchImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<import("react").JSX.Element> {
  const { locale } = await params;
  return <IndependentBatchImportClient locale={locale} />
}
