import { Sparkles } from "lucide-react";
import { useXynConsole } from "../../state/xynConsoleStore";
import XynConsolePanel from "./XynConsolePanel";

export default function XynConsoleNode() {
  const { open, setOpen, badgeActive } = useXynConsole();

  return (
    <div className="xyn-console-anchor">
      <button
        type="button"
        className={`xyn-console-node ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Xyn (⌘K / Ctrl+K)"
        title="Xyn (⌘K / Ctrl+K)"
      >
        <Sparkles size={14} />
        <span>Xyn</span>
        {badgeActive ? <span className="xyn-console-badge" aria-hidden="true" /> : null}
      </button>
      <XynConsolePanel />
    </div>
  );
}
