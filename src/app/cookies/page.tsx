import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal-meta";
import { DataTable, LegalSection, LegalShell, legalIcons } from "@/components/legal";

export const metadata: Metadata = {
  title: "Cookie Policy — Bridge",
  description:
    "Bridge sets no cookies. This page documents the small amount of strictly-necessary browser storage it uses instead.",
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookie Policy"
      icon={legalIcons.cookies}
      intro="The shortest possible answer: Bridge does not set any cookies. This page documents what your browser does store, and why no consent banner is needed."
      updated={LEGAL.lastUpdated}
    >
      <LegalSection title="1. Cookies: none">
        <p>
          This application does not set, read, or send any HTTP cookies — not for session handling,
          not for analytics, not for advertising. There are no first-party cookies and no
          third-party cookies on this site.
        </p>
      </LegalSection>

      <LegalSection title="2. What your browser does store">
      <p>
        A small amount of data is kept in your browser&apos;s <strong>local storage</strong>, which
        never leaves your device and is never transmitted to us except where noted:
      </p>
        <DataTable
          rows={[
            [
              "bridge:name",
              "Your PC's display name, shared with the paired device during a session.",
              "Until you clear site data",
            ],
            [
              "bridge:phoneName",
              "Your phone's display name, shared with the paired device during a session.",
              "Until you clear site data",
            ],
            [
              "bridge:privacy-ack",
              "Records that you dismissed the privacy notice so it isn't shown repeatedly.",
              "Until you clear site data",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Why there is no consent banner">
        <p>
          Consent banners are required when a site stores or accesses information that is{" "}
          <strong>not strictly necessary</strong> — for example analytics, advertising, or
          preference tracking (ePrivacy Directive Art. 5(3), and guidance from EU data-protection
          authorities). Everything Bridge stores falls squarely within the{" "}
          <strong>strictly-necessary exemption</strong>: it is required to provide the transfer
          service you explicitly request. Accordingly, no cookie-consent mechanism is legally
          triggered, and we deliberately avoid adding dark-pattern banners that serve no purpose.
        </p>
        <p>
          If we ever introduce anything non-essential (for example, optional anonymous analytics),
          we will update this page and ask for opt-in consent before enabling it.
        </p>
      </LegalSection>

      <LegalSection title="4. How to clear stored data">
        <p>
          You can remove everything at any time: in Chrome/Edge, open{" "}
          <span className="font-mono text-[12px]">Settings → Privacy and security → Site settings →
          View permissions and data stored across sites</span>, find this site, and delete it — or
          simply clear browsing data for the site. Clearing storage has no effect on transfers in
          progress other than forgetting your display name.
        </p>
      </LegalSection>

      <LegalSection title="5. Questions">
        <p>
          Questions about this policy: {LEGAL.contactEmail}. Also see the{" "}
          <a href="/privacy" className="text-[#5ea8ff] underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
