import type { ProvisionStatus } from "../api/types";

const STATUS_COLOR: Record<ProvisionStatus, string> = {
  requested: "status-neutral",
  provisioning: "status-warn",
  running: "status-info",
  ready: "status-good",
  error: "status-bad",
  terminating: "status-warn",
  terminated: "status-neutral",
};

export default function StatusPill({ status }: { status: ProvisionStatus }) {
  return <span className={`status-pill ${STATUS_COLOR[status]}`}>{status}</span>;
}
