import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const metadata = {
  title: "Request Submitted | 3D Print Quoting",
};

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("contact_instructions")
    .single();

  const statusUrl = token ? `/status/${token}` : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-600" />
          <CardTitle className="text-2xl">Request Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground">Your Request ID</p>
            <p className="mt-1 font-mono text-sm font-bold break-all">
              {id}
            </p>
          </div>

          {statusUrl && (
            <div className="text-center">
              <p className="mb-2 text-sm text-muted-foreground">
                Bookmark this link to check your status anytime:
              </p>
              <Link href={statusUrl}>
                <Button variant="outline" size="sm">
                  View Request Status
                </Button>
              </Link>
            </div>
          )}

          <div className="rounded-md border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4" />
              Next Steps
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="whitespace-pre-line">
                {settings?.contact_instructions ||
                  "Add my Snapchat: your_handle. When you add me, send your Request ID so I can match you."}
              </p>
              <p>
                I&apos;ll contact you to confirm the final price/settings and
                you can pay by e-transfer or cash at pickup.
              </p>
              <p>Pickup is on main campus.</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link href="/request">
              <Button variant="ghost" size="sm">
                Request a Print
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="ghost" size="sm">
                Browse Store
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
