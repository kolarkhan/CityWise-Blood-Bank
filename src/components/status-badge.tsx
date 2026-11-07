import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  if (["COMPLETED", "DONE", "VERIFIED", "ACCEPTED", "SUCCESS"].includes(normalized)) {
    return <Badge variant="success">{status}</Badge>;
  }
  if (["CANCELLED", "REJECTED", "BLOCKED", "ERROR"].includes(normalized)) {
    return <Badge variant="danger">{status}</Badge>;
  }
  if (["OPEN", "MATCHING", "PENDING", "SCHEDULED"].includes(normalized)) {
    return <Badge variant="warning">{status}</Badge>;
  }
  return <Badge variant="info">{status}</Badge>;
}
