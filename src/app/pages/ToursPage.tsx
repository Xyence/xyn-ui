import { ChevronRight } from "lucide-react";

export default function ToursPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Tours</h2>
          <p className="muted">Guided onboarding walkthroughs for core workflows.</p>
        </div>
      </div>
      <section className="card">
        <div className="card-header">
          <h3>Available tours</h3>
        </div>
        <button
          className="instance-row guides-tour-row"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: "deploy-subscriber-notes" } }));
          }}
        >
          <div>
            <strong>Deploy Subscriber Notes</strong>
            <span className="muted small">Guided end-to-end onboarding flow</span>
          </div>
          <span className="guides-tour-arrow" aria-hidden="true">
            <ChevronRight size={16} />
          </span>
        </button>
      </section>
    </>
  );
}
