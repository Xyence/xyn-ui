import type { ReactNode } from "react";

type EditorCentricLayoutProps = {
  top: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
  activity: ReactNode;
};

/**
 * Reusable editor-centric template.
 * Keep primary editor content centered while metadata and activity panels
 * remain accessible without forcing full-page vertical stacking.
 */
export default function EditorCentricLayout({ top, main, inspector, activity }: EditorCentricLayoutProps) {
  return (
    <section className="editor-centric-layout">
      <div className="editor-centric-top">{top}</div>
      <div className="editor-centric-grid">
        <aside className="editor-centric-activity card">{activity}</aside>
        <section className="editor-centric-main card">{main}</section>
        <aside className="editor-centric-inspector card">{inspector}</aside>
      </div>
    </section>
  );
}
