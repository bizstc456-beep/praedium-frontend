import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/legal.css';

export default function TermsOfServicePage() {
  return (
    <div className="rf-legal-page">
      <div className="rf-legal-card">
        <div className="rf-legal-brand">Rentflow</div>
        <h1>Terms of Service</h1>
        <p className="rf-legal-updated">Last updated: September 19, 2026</p>

        <section>
          <h2>1. The basics</h2>
          <p>
            These Terms of Service (the "Terms") govern your use of Rentflow (the "Service"),
            a rental property management tool for landlords: it helps you track properties and
            tenants, record rent payments, send SMS notifications, store lease documents, and
            generate income/expense reports.
          </p>
          <p>
            You must be at least 18 years old to create an account. You're responsible for
            keeping your account credentials secure and for all activity that happens under
            your account.
          </p>
        </section>

        <section>
          <h2>2. Your subscription</h2>
          <p>
            Rentflow is billed at $150 CAD/month (the "Pro Plan"), with a 30-day free trial. A
            payment card is required to start your trial, but you won't be charged until the
            trial period ends. Your subscription automatically renews each month until you
            cancel it.
          </p>
          <p>
            Cancelling stops future billing but doesn't refund the current billing period.
            Payments are processed by Stripe — Rentflow never sees your full card number. We
            may change our prices, but we'll give you notice before any change affects you.
          </p>
        </section>

        <section>
          <h2>3. Your account and your data</h2>
          <p>
            You own the data you put into Rentflow ("Your Data") — your property details,
            tenant information, payment records, and documents. We don't sell it.
          </p>
          <p>
            <strong>
              As a landlord using Rentflow, you're responsible for having the legal right to
              store your tenants' personal information under applicable privacy law (including
              Quebec's Law 25) and for informing your tenants accordingly.
            </strong>
          </p>
          <p>
            You can export Your Data (as CSV) before closing your account. After closure, we
            retain it briefly and then delete it, as described in our Privacy Policy.
          </p>
        </section>

        <section>
          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use Rentflow for anything illegal, including housing discrimination</li>
            <li>Send harassing or spam SMS messages through the Service</li>
            <li>Access another user's account, or probe or bypass our security</li>
            <li>Reverse-engineer, scrape, or resell the Service</li>
            <li>Upload malicious files or infringe on others' intellectual property</li>
          </ul>
          <p>
            Accounts that violate this section may be suspended or terminated, with notice
            where reasonably possible.
          </p>
        </section>

        <section>
          <h2>5. Third-party services we rely on</h2>
          <p>Rentflow is built on top of a few third-party services, each with its own terms and privacy practices:</p>
          <table className="rf-legal-table">
            <thead>
              <tr><th>Provider</th><th>What it's used for</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase</td><td>Database, authentication, and file storage</td></tr>
              <tr><td>Stripe</td><td>Billing and payment processing</td></tr>
              <tr><td>Twilio</td><td>Sending SMS messages</td></tr>
              <tr><td>Anthropic (Claude)</td><td>Drafting the text of some automated SMS messages</td></tr>
              <tr><td>Railway / Vercel</td><td>Hosting the application</td></tr>
            </tbody>
          </table>
          <p>An outage on one of these providers' end can affect the availability of Rentflow.</p>
        </section>

        <section>
          <h2>6. Warranties, liability, and indemnification</h2>
          <p>
            Rentflow is provided "as is" and "as available." We don't guarantee the Service will
            be uninterrupted, error-free, fully secure, or that it satisfies your regulatory
            obligations as a landlord — that responsibility is yours.
          </p>
          <p>
            Our liability to you is capped at the amount you paid us in the trailing 12 months,
            and we're not liable for indirect or consequential damages. You agree to indemnify
            Rentflow against claims arising from your misuse of the Service, your violation of
            these Terms, or your non-compliance with privacy law.
          </p>
        </section>

        <section>
          <h2>7. Termination, changes, and legal details</h2>
          <p>
            You can close your account at any time. We may suspend or terminate your account for
            violating these Terms, for non-payment, or if legally required to, with notice where
            reasonably possible. We'll notify active subscribers before any material change to
            these Terms takes effect.
          </p>
          <p>
            These Terms are governed by the laws of Quebec and Canada. Any disputes will be
            handled in the judicial district where Rentflow operates.
          </p>
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:rentflow.biz@gmail.com">rentflow.biz@gmail.com</a>.
          </p>
        </section>

        <div className="rf-legal-footer">
          <Link to="/">Back to Rentflow</Link>
        </div>
      </div>
    </div>
  );
}
