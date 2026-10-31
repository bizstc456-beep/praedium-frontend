import React from 'react';
import AppShell from '../components/AppShell';

export default function HelpPage() {
  return (
    <AppShell active="help">
      <div className="pd-page-header">
        <h1>Help &amp; FAQ</h1>
        <p>Quick answers to the questions landlords ask most. Can't find yours? Email us below.</p>
      </div>

      <div className="pd-faq">
        <h2>Getting started</h2>
        <div className="pd-faq-item">
          <h3>How are "units" counted when I add a property?</h3>
          <p>It's based on property type: a single-family home or condo counts as 1 unit, a duplex as 2, a triplex as 3, and a fourplex as 4. Your plan's unit cap applies to your total across every property you own, not just one.</p>
        </div>
        <div className="pd-faq-item">
          <h3>How do I get a tenant set up on the portal?</h3>
          <p>Add the tenant under their property, then use the tenant's menu to invite them to the tenant portal. That sends them a login so they can view their lease, payment history, and message you directly.</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>Rent &amp; payments</h2>
        <div className="pd-faq-item">
          <h3>Does Praedium collect rent from my tenants?</h3>
          <p>Not yet — you record each rent payment yourself once it's received, and Praedium tracks the history for you. Tenants don't pay through the app.</p>
        </div>
        <div className="pd-faq-item">
          <h3>Do tenants get reminded automatically?</h3>
          <p>Yes. Praedium texts a friendly reminder 3 days before rent is due, and a follow-up if it's still showing unpaid a couple of days after.</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>Documents &amp; maintenance</h2>
        <div className="pd-faq-item">
          <h3>What files can I upload?</h3>
          <p>PDFs, Word documents, and images (JPEG, PNG, WEBP, or HEIC), up to 15MB per file.</p>
        </div>
        <div className="pd-faq-item">
          <h3>How do maintenance requests work?</h3>
          <p>Tenants submit requests from their portal with a description and an optional photo. They show up on your Maintenance page as Open, and you can move them to In Progress or Resolved as you handle them.</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>Lease renewals &amp; messages</h2>
        <div className="pd-faq-item">
          <h3>What does "renewal soon" mean?</h3>
          <p>A lease is flagged starting 90 days before its end date, giving you time to decide on a renewal or rent change before Quebec's notice deadlines.</p>
        </div>
        <div className="pd-faq-item">
          <h3>How do I text a tenant?</h3>
          <p>The Messages page is a shared inbox for SMS with all your tenants — send, read, and keep a record of every conversation in one place.</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>Plans, billing &amp; your data</h2>
        <div className="pd-faq-item">
          <h3>What's included in each plan?</h3>
          <p>Starter covers up to 5 units, Growth up to 20, and Portfolio is unlimited. Every plan starts with a 30-day free trial — we collect a card upfront, but you're not charged until the trial ends.</p>
        </div>
        <div className="pd-faq-item">
          <h3>Can I export or delete my data?</h3>
          <p>Yes — from Settings you can download a copy of your account data anytime, or request account deletion. Deletion requests are reviewed by our team rather than actioned instantly.</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>Still stuck?</h2>
        <div className="pd-faq-item">
          <h3>How do I reach support?</h3>
          <p>
            Email <a href="mailto:support@praedium.pro">support@praedium.pro</a> — it's actively
            monitored, and we aim to respond within 24 hours.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
