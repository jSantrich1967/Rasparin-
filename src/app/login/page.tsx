import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? "/dashboard";
  return <LoginForm from={from} />;
}
