// Terms & Conditions version strings.
// Bump a version date to force re-acceptance by all users of that role.
export const TERMS_VERSIONS = {
  BUYER: '2026-04-16',
  STALL_OWNER: '2026-04-16',
  DELIVERY_PERSON: '2026-04-16',
} as const;

export type TermsRole = keyof typeof TERMS_VERSIONS;
