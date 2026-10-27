// Klik til Kontakt – browseragent v2
// Kører: npx tsx klikagent.ts https://virksomhed.dk
// Kræver: npm install playwright tsx && npx playwright install chromium
// Scoringmodellen ligger i ./scoring.ts.

import { chromium, type Page } from "playwright";
import { scoreSite, clickCount, type ContactType, type SiteAnalysis } from "./scoring";

// ---------- Konfiguration ----------
const MAX_DEPTH = 4;
const MAX_PAGES = 40;
const TIMEOUT = 20000;
const SETTLE_MS = 4000; // ventetid så JS-menuer og chatwidgets når at tegne

// Matcher nu også linkets URL og aria-label, ikke kun synlig tekst
const CONTACT_WORDS =
  "kontakt|kundeserv|service|support|hjælp|help|telefon|tlf|chat|spørg|skriv|send|besked|message|contact|call";

const CONTACT_RE = new RegExp(CONTACT_WORDS, "i");
const CONTACT_PATH_RE = new RegExp(
  "kontakt|kundeserv|customer|service|support|help|phone|contact|chat|message|faq", "i"
);

type Step = { label: string; url: string };
type Finding = { contactType: ContactType; evidence: string };

// Genkendelse af et dansk telefonnummer som almindelig tekst (uden tel:-link)
function findPlainTextPhone(text: string): string | null {
  const re = /(\+45[\s-]?)?(\d{2}[\s-]?){3}\d{2}/g;
  const CONTEXT_RE = /ring|telefon|tlf|opkald|kald|call|kontakt|kundeserv/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length !== 8 && digits.length !== 10) continue; // 8 cifre, evt. med +45
    if (digits.length === 10 && !digits.startsWith("45")) continue;
    const local = digits.length === 10 ? digits.slice(2) : digits;
    if (!/^[2-9]/.test(local[0])) continue; // dansk nummer starter typisk 2-9
    // Kræv kontakt-ord i nærheden (undgår datoer og priser)
    const from = Math.max(0, m.index - 80);
    const context = text.slice(from, m.index + m[0].length + 80);
    if (CONTEXT_RE.test(context)) return m[0].trim();
  }
  return null;
}

function classify(page: Page): Promise<Finding | null> {
  return page.evaluate(() => {
    // 1) Klik-for-at-ring-knap (tel:-link)
    const tel = document.querySelector('a[href^="tel:"]');
    if (tel) return { contactType: "phone", evidence: "tel: " + tel.getAttribute("href") };

    // 2) Chat-widget (Intercom, Zendesk, Crisp, Tidio, Drift, LiveChat m.fl.)
    const widget = document.querySelector(
      'iframe[src*="intercom"], iframe[src*="zdassets"], iframe[src*="crisp"], ' +
      'iframe[src*="tidio"], iframe[src*="drift"], iframe[src*="livechat"], ' +
      'iframe[title*="chat" i], [id*="chat-container" i], .chat-widget'
    );
    if (widget) {
      return { contactType: "livechat-bot-first", evidence: "chat-widget: " + (widget.getAttribute("src") || "iframe") };
    }

    // 3) E-mail: navngivet modtager er bedre end generisk
    const mails = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
      .map((a) => (a as HTMLAnchorElement).getAttribute("href")!);
    if (mails.length) {
      const personal = mails.find((m) => {
        const local = m.replace("mailto:", "").split("?")[0].split("@")[0].toLowerCase();
        return !/^(info|kontakt|support|hello|hi|admin|office|salg|sales|service)/.test(local);
      });
      return personal
        ? { contactType: "email-person", evidence: personal }
        : { contactType: "general-email", evidence: mails[0] };
    }

    // 4) Skriv til kundeservice: formular med beskedfelt (textarea) eller e-mailfelt
    const form = document.querySelector(
      'form[action*="contact" i], form[action*="kontakt" i], form[id*="contact" i], form[action*="kundeserv" i]'
    );
    const formWithMessage = document.querySelector("form textarea, form input[type=email]");
    if (form) return { contactType: "contact-form", evidence: "kontaktformular: " + (form as HTMLFormElement).action };
    if (formWithMessage) {
      return { contactType: "contact-form", evidence: "formular med beskedfelt/e-mailfelt" };
    }

    // 5) Telefonnummer som almindelig tekst håndteres udenfor evaluate (se nedenfor)
    return null;
  }).then(async (result) => {
    if (result) return result as Finding;
    // Tekstbaseret telefonnummer (kræver sideindhold, ikke kun DOM-forespørgsler)
    const text = await page.evaluate(() => document.body.innerText);
    const num = findPlainTextPhone(text);
    if (num) return { contactType: "phone", evidence: "telefonnummer i tekst: " + num };
    return null;
  }) as Promise<Finding | null>;
}

async function crawl(startUrl: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "da-DK" });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  const origin = new URL(startUrl).origin;

  const queue: { url: string; depth: number; path: Step[] }[] = [
    { url: startUrl, depth: 0, path: [{ label: "Forside", url: startUrl }] },
  ];
  const seen = new Set([startUrl]);
  let visited = 0;
  let deadEnds = 0;
  let found: { site: SiteAnalysis; evidence: string } | null = null;

  while (queue.length && visited < MAX_PAGES) {
    const current = queue.shift()!;
    visited++;

    let ok = true;
    try {
      await page.goto(current.url, { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch { /* fortsæt */ }
      await page.waitForTimeout(SETTLE_MS); // lad menuer og widgets tegne
    } catch {
      ok = false;
    }

    if (ok) {
      const finding = await classify(page);
      if (finding) {
        const site: SiteAnalysis = {
          url: startUrl,
          steps: current.path.map((s) => s.label),
          contactType: finding.contactType,
          openingHours: "unknown",
          responseExpectation: "none",
          deadEnds,
        };
        found = { site, evidence: finding.evidence };
        console.log("\nKONTAKT FUNDET på depth " + current.depth + " (" + finding.contactType + ")");
        console.log("  Bevis: " + finding.evidence);
        console.log("  Kliksti: " + current.path.map((s, i) => (i + 1) + ". " + s.label).join(" -> "));
        break;
      }
    }

    if (current.depth >= MAX_DEPTH) continue;

    // Høst links: synlig tekst, aria-label, title, img-alt OG adressens sti
    let links: { label: string; href: string; path: string }[] = [];
    if (ok) {
      links = await page.$$eval("a[href]", (as) =>
        as
          .map((a) => {
            const el = a as HTMLAnchorElement;
            const label =
              el.innerText.trim().slice(0, 60) ||
              el.getAttribute("aria-label")?.trim() ||
              el.title?.trim() ||
              el.querySelector("img")?.alt?.trim() ||
              "";
            let path = "";
            try { path = new URL(el.href).pathname.toLowerCase(); } catch { path = ""; }
            return { label, href: el.href, path };
          })
          .filter((l) => l.href)
      );
    }

    const relevant = links.filter((l) => {
      if (!l.href.startsWith(origin) || seen.has(l.href)) return false;
      return CONTACT_RE.test(l.label) || CONTACT_PATH_RE.test(l.path);
    });

    if (relevant.length === 0) deadEnds++;

    for (const l of relevant.slice(0, 8)) {
      seen.add(l.href);
      queue.push({
        url: l.href,
        depth: current.depth + 1,
        path: [...current.path, { label: l.label || l.path, url: l.href }],
      });
    }
  }

  await browser.close();

  if (!found) {
    console.log("\nIngen kontaktmulighed fundet på " + startUrl + " inden for " + MAX_DEPTH + " klik.");
    console.log("Døde ender: " + deadEnds);
    return;
  }

  const score = scoreSite(found.site);
  console.log("\n---------- RESULTAT ----------");
  console.log("Hjemmeside:  " + found.site.url);
  console.log("Klikantal:    " + clickCount(found.site) + " (inkl. forside)");
  console.log("Kontakttype:  " + found.site.contactType);
  console.log("Døde ender:   " + found.site.deadEnds);
  console.log("Sikkerhedsscore: " + score + "/100");
  console.log(score >= 80 ? "Høj sandsynlighed for at nå et menneske" : score >= 55 ? "Middel sandsynlighed" : score >= 25 ? "Lav sandsynlighed" : "Meget lav / ingen kontakt");
}

const target = process.argv[2];
if (!target) {
  console.error("Brug: npx tsx klikagent.ts https://virksomhed.dk");
  process.exit(1);
}
crawl(target).catch((e) => {
  console.error("Fejl:", e.message);
  process.exit(1);
});
