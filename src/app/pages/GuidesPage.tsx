import { useState } from "react";
import InlineMessage from "../../components/InlineMessage";

const STARTER_PROMPT = `Create a small telecom-oriented demo application called “Subscriber Notes” that demonstrates a full-stack Xyn deployment with a React frontend, API service, and PostgreSQL database.

This app should simulate a lightweight internal tool used by telecom support staff to track notes about subscribers or circuits.

Environment & deployment:

* Target environment: Dev
* Deploy to instance: xyn-seed-dev-1
* Public hostname: sub-notes-<MY NAME>.xyence.io
* Use platform defaults for networking, TLS, and service exposure

Architecture requirements:

Backend:

* Create an API service that exposes REST endpoints for managing subscriber notes
* Each note should include:
  * id (auto-generated)
  * subscriber_id (string)
  * note_text (string)
  * created_at (timestamp)
* Implement CRUD endpoints:
  * create note
  * list notes
  * delete note
* Use PostgreSQL for persistence
* Automatically provision and migrate the database schema

Frontend:

* Build a React web UI served by the backend or as a separate web service
* Include:
  * Header bar titled “Subscriber Notes — Dev Demo”
  * A table displaying notes from the API
  * A simple form to add a new note
  * A delete action per row
* Keep styling minimal but clean

Data model intent:

Treat subscriber_id as something a telecom support agent might use (e.g., circuit ID, ONU serial, or customer number). The goal is to simulate a realistic operational workflow, not just generic demo data.

Operational requirements:

* Health endpoint for the API
* Environment configuration via secrets/config
* Logging enabled
* Database connection managed through Xyn primitives
* Idempotent deployment (safe to re-run)

Developer workflow goals:

* Generate all services from intent
* Provision database automatically
* Build + deploy UI and API
* Expose the app at the assigned hostname
* Validate that:
  * notes persist
  * API is reachable
  * UI updates live

Definition of done:

When deployed, visiting the https url of the specified hostname should display the login page. Logging in via the login page should display the application.`;

const EXERCISE = `# Xyn Quickstart Exercise (Draft -> Deploy)

## 1) Create a new Draft session
1. Open **Design -> Drafts**.
2. Click **New draft session**.
3. Set:
   - **Title**: \`Subscriber Notes <Your Name>\`
   - **Project key**: \`notes-<your-name>\`
   - **Initial prompt**: paste the prompt from this guide.
4. In the prompt, update only the hostname line to a unique value:
   - \`Public hostname: sub-notes-<your-name>.xyence.io\`
5. Click **Create draft session**.

## 2) Generate draft output
1. In the right-side Draft detail pane, scroll to **Workflow** and click **Generate draft**.
2. What this does:
   - It resolves context packs and prompt sources into a deterministic context.
   - It generates a draft blueprint JSON candidate and runs schema validation.
3. Wait for output to appear in **Draft JSON**.

## 3) Submit draft as blueprint
1. Click **Submit as Blueprint**.
2. In the confirmation modal, verify:
   - Namespace/name are correct.
   - Environment is **Dev**.
   - Instance is **xyn-seed-dev-1**.
   - Hostname is unique and valid.
3. Confirm submit.

## 4) Queue build/deploy work
1. Go to **Design -> Blueprints**.
2. Select the blueprint you just created.
3. Click **Submit & Queue DevTasks**.
4. Go to **Deploy & Runtime -> Dev Tasks** to watch tasks queue/run.
5. If tasks do not appear, check **Deploy & Runtime -> Runs** for the blueprint run status and errors.

## 5) Validate deployed app
1. Open your app URL in an **incognito** window:
   - \`https://sub-notes-<your-name>.xyence.io\`
2. Log in with the Xyn identity provider.
3. Confirm you land on the app page after login.
4. Validate:
   - Create/list/delete notes from UI.
   - Data persists (PostgreSQL-backed).

## 6) Identity provider check (if login routing is wrong)
If app login/provider behavior looks wrong:
1. Open **Platform Control Plane -> OIDC App Clients**.
2. Select your app client.
3. Ensure **Xyn** is in allowed providers and set as default provider.
4. Save, then retry in an incognito window.

## What happens during blueprint deployment
When you submit and queue DevTasks, Xyn orchestrates the full platform workflow:
- Generates/updates backend + frontend services from intent.
- Provisions/wires PostgreSQL and service configuration.
- Builds and publishes container images.
- Creates/updates release and release plan objects.
- Applies runtime deployment to target instance.
- Configures ingress/reverse proxy routing.
- Creates/updates DNS records.
- Obtains/renews TLS certificates (platform TLS mode).
- Runs verification tasks (health, reachability, deployment checks).

## Releases and Release Plans (what they mean)
- **Release**: versioned deployable artifact set (immutable build output).
- **Release Plan**: deployment intent that binds a release to environment/target settings.
- You can inspect both in **Package -> Releases** and **Package -> Release Plans**.

## Deprovisioning (for repeat testing)
To clean up resources and test again:
1. Go to **Design -> Blueprints** and select your blueprint.
2. In **Lifecycle**, use **Deprovision** (or **Archive** if you only want to hide/disable).
3. Review the deprovision plan, type-to-confirm, and execute.
4. Monitor progress in **Runs** / **Dev Tasks**.
5. Re-run the exercise with a new unique hostname.

## Troubleshooting / Bug reports
If anything fails:
1. Press **Ctrl+Shift+B** (or **Cmd+Shift+B** on macOS) to open Bug Report.
2. Include:
   - What step failed
   - Expected vs actual behavior
   - Run/DevTask IDs if available
   - Relevant screenshots
3. Submit report and continue debugging from **Runs** + **Dev Tasks**.
`;

export default function GuidesPage() {
  const [message, setMessage] = useState<string | null>(null);

  const copyStarter = async () => {
    try {
      await navigator.clipboard.writeText(STARTER_PROMPT);
      setMessage("Starter prompt copied.");
    } catch {
      setMessage("Copy failed. Clipboard permission may be blocked.");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Guides</h2>
          <p className="muted">Reference walkthroughs for repeatable demos.</p>
        </div>
      </div>

      {message && <InlineMessage tone="info" title="Guide" body={message} />}

      <section className="card">
        <div className="card-header">
          <h3>Xyn Quickstart Exercise</h3>
        </div>
        <div className="actions" style={{ marginBottom: 12 }}>
          <button className="ghost" onClick={copyStarter}>Copy starter prompt</button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, margin: 0 }}>{EXERCISE}</pre>
      </section>
    </>
  );
}
