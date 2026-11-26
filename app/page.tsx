import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ShoppingBag } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
          3D Print Quoting
        </h1>
        <p className="mb-10 text-lg text-muted-foreground">
          Get an instant estimate for your 3D print, or browse pre-made items in
          the store. Campus pickup only.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/request" className="block">
            <Card className="group h-full cursor-pointer border-2 transition-colors hover:border-primary">
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Request a Print</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload your STL/3MF files and get an instant estimate
                  </p>
                </div>
                <Button variant="outline" className="mt-2">
                  Upload Files
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/store" className="block">
            <Card className="group h-full cursor-pointer border-2 transition-colors hover:border-primary">
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Print Store</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Browse pre-made items ready to print or request
                  </p>
                </div>
                <Button variant="outline" className="mt-2">
                  Browse Store
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
