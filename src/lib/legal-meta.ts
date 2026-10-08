/**
 * Operator / business identity shown across the legal pages.
 *
 * ⚠️ REQUIRED BEFORE PUBLICATION: replace every bracketed placeholder with the
 * real operator's legal details. Publishing privacy/terms pages with placeholders
 * is itself a compliance failure (GDPR Art. 13, India DPDP §5 notice, and most
 * consumer-protection regimes require the data controller's identity).
 */
export const LEGAL = {
  serviceName: "Bridge",
  serviceDescription: "direct device-to-device file transfer web app",
  operatorName: "[Your legal/business name]",
  operatorAddress: "[Registered address, city, country]",
  contactEmail: "[privacy@your-domain.example]",
  /** India DPDP Act 2023 §8(10) — a grievance officer must be designated. */
  grievanceOfficerName: "[Grievance officer name]",
  grievanceOfficerEmail: "[grievance@your-domain.example]",
  grievanceResponseDays: 15,
  /** Replace with the jurisdiction that applies to the operator. */
  governingLaw: "[State/Country]",
  lastUpdated: "4 October 2026",
} as const;
