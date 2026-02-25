import { useEffect, useRef } from "react";
import { useXynConsole } from "../../state/xynConsoleStore";
import XynConsoleCore from "./XynConsoleCore";

export default function XynConsolePanel() {
  const { open, setOpen, pendingCloseBlock } = useXynConsole();
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!open) return;
      if (pendingCloseBlock) return;
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, pendingCloseBlock, setOpen]);

  if (!open) return null;

  return (
    <section className="xyn-console-panel" ref={panelRef} role="dialog" aria-label="Xyn Console">
      <XynConsoleCore mode="overlay" onRequestClose={() => setOpen(false)} />
    </section>
  );
}
