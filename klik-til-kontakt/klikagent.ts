// Klik til Kontakt – browseragent
// Kører: npx tsx klikagent.ts https://virksomhed.dk
// Kræver: npm install playwright tsx && npx playwright install chromium
// Scoringmodellen ligger i ./scoring.ts (samme mappe som i GitHub-repositoriet).

import { chromium, type Page } from "playwright";
import { scoreSite, clickCount, type ContactType, type SiteAnalysis } from "./scoring";

// ---------- Konfiguration ----------
const MAX_DEPTH = 4;        // maks. klikdybde fra forsiden
const MAX_PAGES = 40;       // sikkerhedsventil mod store sider
const TIMEOUT = 15000;

const CONTACT_LINK_RE = /kontakt|kundeserv|service|support|hjælp|help|os$|^om\b|telefon|chat|spørg/i;

type Step = { label: string; url: string };
type Finding = { contactType: ContactType; evidence: string };

function classify(page: Page): Promise<Finding | null> {
  return page.evaluate(() => {
    // 1) Direkte telefonnummer
    const tel = document.querySelector('a[href^="tel:"]');
    if (tel) return { contactType: "phone", evidence: tel.getAttribute("href")! };

    // 2) Personlig vs. generisk e-mail
    const mails = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
      .map((a) => (a as HTMLAnchorElement).getAttribute("href")!);
    if (mails.length) {
      const personal = mails.find((m) => {
        const adr = m.replace("mailto:", "").split("?")[0].toLowerCase();
        const local = adr.split("@")[0];
        return !/^(info|kontakt|support|hello|hi|admin|office|salg|sales|service)/.test(local);
      });
      return personal
        ? { contactType: "email-person", evidence: personal }
        : { contactType: "general-email", evidence: mails[0] };
    }

    // 3) Chat-widget (Intercom, Zendesk, Crisp, Tidio, Drift, LiveChat m.fl.)
    const widget = document.querySelector(
      'iframe[src*="intercom"], iframe[src*="zdassets"], iframe[src*="crisp"], ' +
      'iframe[src*="tidio"], iframe[src*="drift"], iframe[src*="livechat"], ' +
      'iframe[title*="chat" i], [id*="chat-container" i], .chat-widget'
    );
    if (widget) {
      return { contactType: "livechat-bot-first", evidence: "chat-widget fundet: " + (widget.getAttribute("src") || widget.className || "iframe") };
    }

    // 4) Kontaktformular
    const form = document.querySelector('form[action*="contact" i], form[action*="kontakt" i]');
    if (form) return { contactType: "contact-form", evidence: "form action: " + (form as HTMLFormElement).action };

    return null;
  }) as Promise<Finding | null>;
}

async function crawl(startUrl: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "da-DK" });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  const start = new URL(startUrl);
  const origin = start.origin;

  // Kø: sti = kliksti fra forsiden (forsiden tæller som trin 1, som i prototypen)
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
      await page.waitForTimeout(1500); // lad chatwidgets initialisere
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

    let links: { label: string; href: string }[] = [];
    if (ok) {
      links = await page.$$eval("a[href]", (as) =>
        as
          .map((a) => ({
            label: (a as HTMLAnchorElement).innerText.trim().slice(0, 60) || a.getAttribute("aria-label") || "",
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((l) => l.label && l.href)
      );
    }

    const relevant = links.filter(
      (l) => l.href.startsWith(origin) && CONTACT_LINK_RE.test(l.label) && !seen.has(l.href)
    );

    if (relevant.length === 0) deadEnds++;

    for (const l of relevant.slice(0, 5)) {
      seen.add(l.href);
      queue.push({
        url: l.href,
        depth: current.depth + 1,
        path: [...current.path, { label: l.label, url: l.href }],
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
