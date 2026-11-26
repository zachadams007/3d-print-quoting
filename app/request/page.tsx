import { RequestForm } from "@/components/request-form";
import Link from "next/link";

export const metadata = {
  title: "Request a Print | 3D Print Quoting",
};

export default function RequestPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            3D Print Quoting
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Request a Print
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upload your 3D model files, choose your options, and get an instant
            estimate.
          </p>
        </div>
        <RequestForm />
      </main>
    </div>
  );
}
