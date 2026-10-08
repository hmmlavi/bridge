import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal-meta";
import {
  BusinessDetails,
  DataTable,
  LegalSection,
  LegalShell,
  legalIcons,
} from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Bridge",
  description:
    "How Bridge handles data: no cookies, no analytics, no accounts, no cloud storage. Files transfer directly between your devices.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      icon={legalIcons.privacy}
      intro="Bridge is a local-first, device-to-device file transfer tool. This policy explains exactly what is processed, where, and for how long — and just as importantly, what is never collected."
      updated={LEGAL.lastUpdated}
    >
      <LegalSection title="1. Who we are">
        <p>
          {LEGAL.serviceName} (&quot;Bridge&quot;, &quot;the service&quot;) is operated by{" "}
          <strong>{LEGAL.operatorName}</strong> (&quot;we&quot;, &quot;us&quot;). You can reach us
          at <strong>{LEGAL.contactEmail}</strong>. Bridge is a {LEGAL.serviceDescription}: it
          pairs two of your own devices so files move directly between them.
        </p>
      </LegalSection>

      <LegalSection title="2. The short version">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>We set <strong>no cookies</strong> and run <strong>no analytics, advertising, or tracking</strong> of any kind.</li>
          <li>We require <strong>no account</strong> and collect no email, phone number, or identity documents.</li>
          <li><strong>Your files never pass through our servers.</strong> They travel over an encrypted peer-to-peer connection between your devices. We cannot see, store, or access them.</li>
          <li>We sell <strong>nothing</strong> and share data with <strong>no advertisers or data brokers</strong>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What is processed, and why">
        <p>To provide the service, the following data is technically necessary:</p>
        <DataTable
          rows={[
            [
              "Display name",
              "Shown to the paired device (e.g. “Windows PC”, “Pixel 8”). Auto-detected, editable.",
              "Server memory only, for the session; a copy stays in your browser’s local storage",
            ],
            [
              "Session ID + token",
              "Random pairing credentials that let your two devices find each other securely.",
              "Server memory; deleted when the session ends or expires (≤ 2 hours)",
            ],
            [
              "Signaling data (SDP / ICE candidates)",
              "Small WebRTC negotiation messages used to establish the direct connection. Contain IP addresses.",
              "Relayed in server memory only, never written to disk or a database",
            ],
            [
              "bridge:privacy-ack",
              "Remembers that you dismissed the privacy notice.",
              "Your browser’s local storage until you clear it",
            ],
          ]}
        />
        <p>
          File names, sizes, and contents travel exclusively over the encrypted peer-to-peer data
          channel between your devices. Our servers never receive them.
        </p>
      </LegalSection>

      <LegalSection title="4. What we never collect">
        <p>
          No cookies, no analytics or usage metrics, no advertising identifiers, no location data,
          no contacts, no device fingerprinting, no accounts, no file contents or thumbnails, and
          no persistent logs of your transfers are collected by this application.
        </p>
        <p>
          Our hosting provider may keep standard infrastructure logs (such as the IP address that
          loaded the page) under its own privacy terms, as with any website. These are outside the
          application&apos;s control and are not used by us.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party services">
        <p>
          Bridge uses Google&apos;s public STUN servers (
          <span className="font-mono text-[12px]">stun.l.google.com</span>) solely to help your two
          devices discover a direct network path to each other. Your IP address is technically
          visible to that service during connection setup; no file data, browser data, or personal
          content is sent there. Google&apos;s handling of that traffic is governed by the Google
          Privacy Policy. There are no other third-party embeds, fonts, CDNs, pixels, or scripts on
          this site.
        </p>
      </LegalSection>

      <LegalSection title="6. Legal bases and consent">
        <p>
          Where the GDPR/UK GDPR applies, processing above is based on performance of the service
          you request (Art. 6(1)(b)) and our legitimate interest in operating it securely
          (Art. 6(1)(f)). Under India&apos;s <strong>Digital Personal Data Protection Act, 2023</strong>,
          the limited data described here is processed for the specified purpose of providing the
          transfer service, which you trigger by voluntarily using Bridge — no personal data is sold
          or used for any unrelated purpose.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention">
        <p>
          Pairing sessions live only in server memory and end when you disconnect, close the page,
          or the code expires (4 minutes unused, up to 2 hours active). Nothing about your session
          survives beyond that. Data stored in your own browser remains on your device until you
          clear it.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          Transfers are encrypted in transit (DTLS inside WebRTC; HTTPS for signaling), pairing
          codes are single-session and self-expiring, and incoming files require your explicit
          approval. No method of transmission is 100% secure, but Bridge is designed so that even
          we cannot access your files.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Depending on where you live (including the EEA/UK under GDPR and India under the DPDP
          Act), you may have rights to access, correct, erase, restrict, or port your personal
          data, to object to processing, to withdraw consent, and to complain to a supervisory
          authority. Because Bridge stores so little — and nothing about you that we can identify —
          the practical way to exercise most rights is simply to clear your browser storage or stop
          a session. For anything else, contact us at {LEGAL.contactEmail}.
        </p>
        <p>
          <strong>India (DPDP Act, 2023):</strong> you may raise a grievance with our designated
          grievance officer, listed below, who will respond within{" "}
          {LEGAL.grievanceResponseDays} days. You may also nominate another person to exercise your
          rights in the event of death or incapacity.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          Bridge is not directed at children. It collects no data that would allow us to identify a
          user&apos;s age. If you are under 18 (India) or under the age of digital consent in your
          country (13–16 in the EEA), use Bridge only with a parent or guardian&apos;s involvement.
        </p>
      </LegalSection>

      <LegalSection title="11. International transfers">
        <p>
          Session data is processed wherever this application is hosted and wherever your two
          devices are. Because files travel directly between your devices, the file contents
          themselves never cross our infrastructure. If you use Bridge from the EEA/UK/India, brief
          processing in other regions occurs under the safeguards described above.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          If we ever add optional features that change what is processed (for example, optional
          anonymous analytics), we will update this page first and request consent where required.
          The “last updated” date above always reflects the current version.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact and operator details">
        <BusinessDetails includeGrievance />
      </LegalSection>
    </LegalShell>
  );
}
