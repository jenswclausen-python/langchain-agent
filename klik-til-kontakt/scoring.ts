// Klik til Kontakt – scoringmodel
// Sandsynlighed for at nå en fysisk person (0-100)

export type ContactType =
  | "phone" | "livechat-human" | "email-person" | "livechat-bot-first"
  | "contact-form" | "general-email" | "bot-only" | "none";

export const CONTACT_TYPES: { id: ContactType; label: string; base: number }[] = [
  { id: "phone",            label: "Telefonnummer til personer",      base: 95 },
  { id: "livechat-human",   label: "Livechat med menneske",           base: 85 },
  { id: "email-person",     label: "Personlig e-mail (navngivet)",    base: 65 },
  { id: "livechat-bot-first", label: "Chat der starter med bot",      base: 50 },
  { id: "contact-form",     label: "Kontaktformular (uklart svar)",   base: 35 },
  { id: "general-email",    label: "Generisk e-mail (info@...)",      base: 30 },
  { id: "bot-only",         label: "Kun chatbot / FAQ",                base: 10 },
  { id: "none",             label: "Ingen kontaktmulighed fundet",     base: 0 },
];

export type OpeningHours = "human-hours" | "limited" | "unknown";
export type ResponseExpectation = "documented" | "claim" | "none";

export interface SiteAnalysis {
  url: string;
  steps: string[];
  contactType: ContactType;
  openingHours: OpeningHours;
  responseExpectation: ResponseExpectation;
  deadEnds: number;
}

export function scoreSite(site: SiteAnalysis): number {
  const type = CONTACT_TYPES.find((t) => t.id === site.contactType) ?? CONTACT_TYPES[7];
  const hoursAdd = site.openingHours === "human-hours" ? 10 : site.openingHours === "unknown" ? -5 : 0;
  const respAdd = site.responseExpectation === "documented" ? 10 : site.responseExpectation === "none" ? -5 : 0;
  const clickPenalty = Math.max(0, site.steps.length - 3) * 2;
  const deadEndPenalty = site.deadEnds * 5;
  return Math.max(0, Math.min(100, Math.round(type.base + hoursAdd + respAdd - clickPenalty - deadEndPenalty)));
}

export function clickCount(site: SiteAnalysis): number {
  return site.steps.length;
}
