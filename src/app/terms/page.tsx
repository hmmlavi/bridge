import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal-meta";
import {
  BusinessDetails,
  LegalSection,
  LegalShell,
  legalIcons,
} from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Bridge",
  description:
    "The terms for using Bridge, a direct device-to-device file transfer tool operated as-is with no accounts and no file custody.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      icon={legalIcons.terms}
      intro="Plain-language rules for using Bridge. By using the service you accept these terms; if you don't agree, please don't use it."
      updated={LEGAL.lastUpdated}
    >
      <LegalSection title="1. The service">
        <p>
          {LEGAL.serviceName} is operated by <strong>{LEGAL.operatorName}</strong>{" "}
          ({LEGAL.contactEmail}). It provides temporary, browser-based sessions that pair two
          devices (for example a Windows PC and an Android phone) so files can be transferred
          directly between them over an encrypted peer-to-peer connection. No account is required.
        </p>
      </LegalSection>

      <LegalSection title="2. No custody of your files">
        <p>
          Bridge is a conduit, not a host. Your files are transmitted directly between your own
          devices and are never uploaded to, stored on, or accessible by our servers. We have no
          ability to review, recover, delete, or restore the content you transfer. Once a session
          ends, it is gone.
        </p>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <p>You agree not to use Bridge to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>transfer content that is illegal in your jurisdiction or in the recipient&apos;s;</li>
          <li>distribute malware, spyware, or other harmful code;</li>
          <li>infringe intellectual-property rights (pirated media, unlicensed software, etc.);</li>
          <li>share content involving exploitation of minors — we will relay credible reports to the relevant authorities;</li>
          <li>harass, defraud, or send unsolicited files to other people;</li>
          <li>probe, attack, or attempt to disrupt the service or other users&apos; sessions.</li>
        </ul>
        <p>
          You are solely responsible for the files you send and receive, and for complying with the
          laws that apply to you and your content.
        </p>
      </LegalSection>

      <LegalSection title="4. Pairing codes and your responsibilities">
        <p>
          A QR code grants access to your current session. Treat it like a key: show it only to the
          person you intend to connect, use the refresh control if it may have been exposed, and
          disconnect when finished. Incoming files always require your explicit approval — review
          them before accepting.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability">
        <p>
          Bridge is provided on a best-effort basis with no service-level commitment. Sessions may
          be interrupted, transfers may fail, and the service may be modified, suspended, or
          withdrawn at any time without notice. Direct connections depend on your network and
          browser support.
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual property">
        <p>
          The Bridge application, including its interface, is the property of the operator.
          Interface icons are from the Lucide project (ISC License, © Lucide contributors). The
          application icons were generated for this project; no third-party photographs, stock
          imagery, or other media are used. Your files remain entirely yours — you grant us no
          rights over them, and we want none.
        </p>
      </LegalSection>

      <LegalSection title="7. Disclaimers">
        <p>
          The service is provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong>,
          without warranties of any kind, express or implied, including merchantability, fitness
          for a particular purpose, and non-infringement. We do not warrant that transfers will
          succeed, that the service will be uninterrupted or error-free, or that it is immune from
          vulnerabilities.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, the operator shall not be liable for indirect,
          incidental, special, consequential, or punitive damages, or for lost data, lost profits,
          or business interruption arising from use of the service. Where liability cannot be
          excluded, it is limited to the amount you paid for the service (currently nothing).
          Nothing in these terms excludes liability that cannot be excluded by law, including under
          applicable consumer-protection legislation.
        </p>
      </LegalSection>

      <LegalSection title="9. Indemnity">
        <p>
          You agree to indemnify and hold the operator harmless from claims arising out of content
          you transfer through the service or your breach of these terms, to the extent permitted
          by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacy">
        <p>
          Your use of Bridge is also governed by the <a href="/privacy" className="text-[#5ea8ff] underline-offset-2 hover:underline">Privacy Policy</a>,
          which describes the minimal data processing involved.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes and governing law">
        <p>
          We may update these terms; the version on this page controls. Continued use after a
          change constitutes acceptance. These terms are governed by the laws of{" "}
          <strong>{LEGAL.governingLaw}</strong>, without prejudice to mandatory consumer rights in
          your country of residence.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <BusinessDetails />
      </LegalSection>
    </LegalShell>
  );
}
