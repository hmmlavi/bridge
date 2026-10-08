import JoinApp from "@/components/join-app";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string | string[] }>;
}) {
  const { id } = await params;
  const { k } = await searchParams;
  const token = typeof k === "string" ? k : "";
  return <JoinApp sessionId={id} token={token} />;
}
