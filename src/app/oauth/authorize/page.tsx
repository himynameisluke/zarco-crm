import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildErrorRedirect,
  validateAuthorizeRequest,
} from "@/lib/oauth/authorize-request";

import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";

function ErrorScreen({
  error,
  description,
}: {
  error: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorization error</CardTitle>
          <CardDescription>
            We can&apos;t process this OAuth request safely. The link may have
            been tampered with, or the requesting application isn&apos;t
            registered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-mono text-destructive">{error}</p>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }

  const result = await validateAuthorizeRequest(params);

  if (result.kind === "client_error") {
    return <ErrorScreen error={result.error} description={result.description} />;
  }

  if (result.kind === "redirect_error") {
    redirect(
      buildErrorRedirect(
        result.redirectUri,
        result.error,
        result.description,
        result.state,
      ),
    );
  }

  const req = result.request;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/oauth/authorize?${params.toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorize {req.client.clientName}</CardTitle>
          <CardDescription>
            Review and approve access to your Zarco CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentForm
            clientName={req.client.clientName}
            userEmail={user.email ?? "unknown"}
            scope={req.scope}
            hiddenFields={{
              client_id: req.clientId,
              redirect_uri: req.redirectUri,
              response_type: req.responseType,
              code_challenge: req.codeChallenge,
              code_challenge_method: req.codeChallengeMethod,
              scope: req.scope,
              state: req.state,
              resource: req.resource,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
