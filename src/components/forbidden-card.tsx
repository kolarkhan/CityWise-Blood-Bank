import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ForbiddenCard({ message }: { message: string }) {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Access Restricted</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/">
          <Button variant="outline">Go home</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
