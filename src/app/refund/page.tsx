import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal-meta";
import { BusinessDetails, LegalSection, LegalShell, legalIcons } from "@/components/legal";

export const metadata: Metadata = {
  title: "Refund Policy — Bridge",
  description:
    "Bridge is free to use: there are no purchases, subscriptions, or payments — and therefore nothing to refund.",
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refund Policy"
      icon={legalIcons.refund}
      intro="Bridge is currently free of charge. This page explains what that means in practice and what would change if paid features are ever introduced."
      updated={LEGAL.lastUpdated}
    >
      <LegalSection title="1. No purchases, no payments">
        <p>
          {LEGAL.serviceName} is provided free of charge. The service has no paid tiers, no
          subscriptions, no one-time purchases, no in-app purchases, and no payment processing of
          any kind. Because no money changes hands, there is nothing to refund.
        </p>
      </LegalSection>

      <LegalSection title="2. No payment data">
        <p>
          We do not collect or store card numbers, bank details, UPI handles, or billing addresses.
          If you are ever asked for payment information by something claiming to be Bridge, it is
          not us — do not enter it, and report it to {LEGAL.contactEmail}.
        </p>
      </LegalSection>

      <LegalSection title="3. If paid features are introduced">
        <p>
          Any future paid functionality would ship with: clear pricing before purchase, a defined
          cancellation route, and refund terms that respect non-waivable statutory rights —
          including, where applicable, the EU/UK 14-day withdrawal right for digital services and
          rights under India&apos;s Consumer Protection Act, 2019. Statutory rights can never be
          excluded by this page.
        </p>
      </LegalSection>

      <LegalSection title="4. Donations or third-party charges">
        <p>
          Bridge does not solicit donations. Your mobile carrier or ISP may charge for data used
          during transfers according to your own plan; those charges are between you and your
          provider and are not refundable by us. Using Bridge on a local Wi-Fi network typically
          avoids mobile-data usage entirely.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>Billing or refund questions can be sent to the operator:</p>
        <BusinessDetails />
      </LegalSection>
    </LegalShell>
  );
}
