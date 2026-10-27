# Klik til Kontakt – Agent

Agent der måler, hvor mange klik der skal til, før en almindelig bruger når kontakt med et menneske på en given hjemmeside – inkl. en vurdering af, hvor sikker man er på at komme i kontakt med en fysisk person.

## Metode

1. Start på forsiden.
2. Klik gennem siden som en almindelig bruger (ikke via søgefunktioner, medmindre det er den oplagte vej).
3. Optag hvert klik som et trin i stien.
4. Stop, når der findes en kontaktmulighed til et menneske: telefonnummer, livechat, personlig e-mail eller kontaktformular.
5. Registrer kontakttype, åbningstider, forventet svartid og antal døde ender (blindgyder).

## Sikkerhedsscore (0–100)

Basen sættes af kontakttypen:

| Kontakttype | Basis |
|---|---|
| Telefonnummer til personer | 95 |
| Livechat med menneske | 85 |
| Personlig e-mail (navngivet) | 65 |
| Chat der starter med bot | 50 |
| Kontaktformular (uklart svar) | 35 |
| Generisk e-mail (info@...) | 30 |
| Kun chatbot / FAQ | 10 |
| Ingen kontaktmulighed fundet | 0 |

Justeringer: åbningstider med mennesker +10, ukendte −5; dokumenteret svartid +10, ingen −5; hvert klik ud over tre −2; hver død ende −5.

## Struktur

- `scoring.ts` – scoringmodel, delt mellem prototype og fremtidig automatisering.
- `prototype/App.tsx` – prototypegrundlag (React). Den fuldt fungerende UI findes i Vibe-canvaset "klik-til-kontakt-agent".

## Næste skridt (fuld automatisering)

Prototypeoptagelsen er manuel. En automatiseret udgave kan bygges med Playwright:

1. `npm init playwright`
2. Start på forsiden, følg "Kontakt", "Kundeservice", "Om os" og lignende links (BFS, maks. dybde 4).
3. Genkend kontaktmoduler: `a[href^="tel:"], a[href^="mailto:"], chat-widgets (Intercom, Zendesk, Crisp m.fl.), formularer`.
4. Skeln mellem bot og menneske (widget-metadata, tekster som "chat med en medarbejder").
5. Gem stien og lad `scoring.ts` beregne klikantal og sikkerhedsscore.
