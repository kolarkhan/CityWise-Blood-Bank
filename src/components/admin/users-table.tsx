"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  isBlocked: boolean;
};

export function AdminUsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter();

  const toggleBlock = async (userId: string, currentBlocked: boolean) => {
    try {
      await fetchJson(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !currentBlocked }),
      });
      toast.success(`User ${currentBlocked ? "unblocked" : "blocked"}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length ? (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.city}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.isBlocked ? "BLOCKED" : "ACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={user.isBlocked ? "outline" : "destructive"} onClick={() => toggleBlock(user._id, user.isBlocked)}>
                      {user.isBlocked ? "Unblock" : "Block"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
