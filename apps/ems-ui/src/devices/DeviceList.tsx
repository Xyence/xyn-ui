import { Link } from "react-router-dom";

export default function DeviceList() {
  return (
    <section>
      <h2>Devices</h2>
      <ul>
        <li>OLT-001 (stub)</li>
        <li>ONU-042 (stub)</li>
      </ul>
      <Link to="/reports">View Reports</Link>
    </section>
  );
}
