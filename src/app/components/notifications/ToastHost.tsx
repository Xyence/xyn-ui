import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useNotifications, type NotificationItem } from "../../state/notificationsStore";

type ActiveToast = NotificationItem | null;

function shouldToast(item: NotificationItem, busy: boolean): boolean {
  if (!item.status) return false;
  if (!["queued", "succeeded", "failed"].includes(item.status)) return false;
  if (busy && item.status === "queued") return false;
  return true;
}

function toastDuration(item: NotificationItem): number {
  if (item.level === "error" || item.status === "failed") return 10000;
  if (item.status === "queued") return 4500;
  return 5000;
}

export default function ToastHost() {
  const { notifications, markRead } = useNotifications();
  const [active, setActive] = useState<ActiveToast>(null);
  const [queue, setQueue] = useState<NotificationItem[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const lastShownAtRef = useRef(0);

  const busy = useMemo(() => {
    const cutoff = Date.now() - 10000;
    return notifications.filter((item) => item.ts >= cutoff).length > 6;
  }, [notifications]);

  useEffect(() => {
    setQueue((prev) => {
      const next = [...prev];
      for (const item of notifications) {
        const key = `${item.id}:${item.version}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        if (!shouldToast(item, busy)) continue;
        const existingIdx = item.dedupeKey ? next.findIndex((entry) => entry.dedupeKey === item.dedupeKey) : -1;
        if (existingIdx >= 0) {
          next[existingIdx] = item;
        } else {
          next.push(item);
        }
      }
      return next;
    });
  }, [busy, notifications]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const now = Date.now();
    const wait = Math.max(0, 2000 - (now - lastShownAtRef.current));
    const timer = window.setTimeout(() => {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [nextActive, ...rest] = prev;
        setActive(nextActive);
        lastShownAtRef.current = Date.now();
        return rest;
      });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      markRead(active.id);
      setActive(null);
    }, toastDuration(active));
    return () => window.clearTimeout(timer);
  }, [active, markRead]);

  if (!active) return null;

  return (
    <div className={`global-toast level-${active.level}`} role="status" aria-live="polite">
      <div className="global-toast-body">
        <strong>{active.title}</strong>
        {active.message && <span>{active.message}</span>}
      </div>
      <button
        type="button"
        className="ghost small"
        onClick={() => {
          markRead(active.id);
          setActive(null);
        }}
        aria-label="Dismiss toast"
      >
        <X size={12} />
      </button>
    </div>
  );
}
