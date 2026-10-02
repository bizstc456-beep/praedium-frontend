import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/legal.css';

export default function PrivacyPolicyPage() {
  return (
    <div className="rf-legal-page">
      <div className="rf-legal-card">
        <div className="rf-legal-brand">Praedium</div>
        <h1>Privacy Policy</h1>
        <p className="rf-legal-updated">Last updated: September 19, 2026</p>

        <section>
          <h2>1. Who this policy covers</h2>
          <p>
            This policy covers both landlords who create a Praedium account and their tenants,
            who don't create accounts themselves but whose information landlords enter into the
            Service.
          </p>
          <p>
            Under Quebec's Law 25, every organization handling personal information must
            designate a person in charge of the protection of personal information. For
            Praedium, that person is Felix, reachable at{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
        </section>

        <section>
          <h2>2. What we collect, and why</h2>
          <table className="rf-legal-table">
            <thead>
              <tr><th>What we collect</th><th>Why</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Account info (name, email, phone, password)</td>
                <td>Account creation, security, and billing contact</td>
              </tr>
              <tr>
                <td>Billing info (card, billing history)</td>
                <td>Handled by Stripe — Praedium never stores your full card number</td>
              </tr>
              <tr>
                <td>Property/tenant info you enter (addresses, names, phone, email, lease dates, rent)</td>
                <td>Core service functionality</td>
              </tr>
              <tr>
                <td>Payment and expense records</td>
                <td>Dashboard, reports, and CSV exports</td>
              </tr>
              <tr>
                <td>Documents you upload (leases, ID copies)</td>
                <td>Retrieval when you need them — never shared outside your account</td>
              </tr>
              <tr>
                <td>Messages (SMS content and inbound replies)</td>
                <td>The communication feature and record-keeping</td>
              </tr>
              <tr>
                <td>Usage data (login times, pages visited, error logs)</td>
                <td>Operating and diagnosing the Service</td>
              </tr>
            </tbody>
          </table>
          <p>
            Tenant information is collected from the landlord, not directly from tenants —
            obtaining tenant consent for this is the landlord's responsibility, as described in
            our Terms of Service.
          </p>
        </section>

        <section>
          <h2>3. Who we share it with</h2>
          <p>We don't sell your data or share it with advertisers. We do share it with the providers that make Praedium work:</p>
          <ul>
            <li>Supabase, for storage</li>
            <li>Stripe, for payments</li>
            <li>Twilio, for SMS</li>
            <li>Anthropic (Claude), which drafts the text of some automated messages — it sees the tenant's name and payment amount for that purpose only</li>
            <li>Railway and Vercel, for hosting</li>
          </ul>
          <p>
            <strong>Cross-border transfer:</strong> none of these providers are based in Quebec,
            so your data is very likely processed on servers outside Quebec (commonly the United
            States). Quebec's Law 25 requires a privacy impact assessment before this kind of
            transfer, confirming the data receives equivalent protection. That assessment should
            be completed and referenced here before this policy is published.
          </p>
          <p>
            We may also disclose information if legally required to, or to protect rights,
            safety, or property.
          </p>
        </section>

        <section>
          <h2>4. How we protect it, and how long we keep it</h2>
          <p>
            Each account's data is isolated and checked on every request. Uploaded documents are
            stored privately and accessed only through short-lived, single-use links — never
            public URLs. All data is encrypted in transit over HTTPS.
          </p>
          <p>
            We keep your data while your account is active. After you close your account, we
            retain it briefly (to handle billing disputes or accidental deletion) and then delete
            it, except for records we're legally required to keep longer, like payment records.
          </p>
          <p>
            If a data breach affects your information, we'll notify Quebec's Commission d'accès
            à l'information (CAI) and any affected individuals as required by law.
          </p>
        </section>

        <section>
          <h2>5. Your rights</h2>
          <p>
            Landlords can access, correct, export, or delete their account data at any time from
            the dashboard, or by contacting us.
          </p>
          <p>
            Tenants have rights under Quebec law to know about, get a copy of, correct, or
            withdraw consent for their personal information (withdrawing consent may limit the
            landlord's ability to manage the tenancy through the Service). The fastest way to
            exercise these rights is usually to ask your landlord directly, but you can also
            contact <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
          <p>You also have the right to file a complaint with the CAI.</p>
        </section>

        <section>
          <h2>6. Other things to know</h2>
          <p>
            <strong>Local storage:</strong> we use your browser's local storage to keep you
            signed in. We don't use advertising cookies or third-party trackers.
          </p>
          <p>
            <strong>Children:</strong> Praedium is a business tool not intended for use by anyone
            under 18, and we don't knowingly collect information from children.
          </p>
          <p>
            <strong>Changes to this policy:</strong> we'll notify active users of any material
            change before it takes effect.
          </p>
          <p>
            <strong>Contact:</strong> questions, requests, or complaints about this policy or
            your personal information can be sent to{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
        </section>

        <div className="rf-legal-footer">
          <Link to="/">Back to Praedium</Link>
        </div>
      </div>
    </div>
  );
}
