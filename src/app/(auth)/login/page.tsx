import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

function isSafeNext(value: string | undefined): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const nextValue = typeof raw.next === "string" ? raw.next : undefined;
  const next = isSafeNext(nextValue) ? nextValue : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Zarco CRM</CardTitle>
        <CardDescription>
          Sign in with your email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  );
}
