# Mini LangChain-agent (dansk)

Dette projekt er et helt simpelt eksempel på en LangChain-/OpenAI-agent,
som kan køre enten lokalt på din maskine eller i GitHub Codespaces.

Agenten:
- bruger `ChatOpenAI` (OpenAI via LangChain)
- har ét værktøj: `mini_calculator`
- svarer på dansk
- kører i en lille tekst-baseret chat i terminalen

## 1. Krav

- En OpenAI API-nøgle
- Python 3.10+ (lokalt) **eller**
- En GitHub-konto (til Codespaces)

---

## 2. Sådan bruger du projektet i GitHub Codespaces

1. Opret et nyt repository på GitHub, f.eks. `langchain-agent`.
2. Download denne mappe som ZIP (fra ChatGPT) og pak den ud.
3. Upload filerne til dit nye repository på GitHub.
4. På GitHub-repo-siden:
   - Klik på den grønne **Code**-knap
   - Vælg fanen **Codespaces**
   - Klik **Create codespace on main**

5. Når Codespace er startet, åbner du en terminal i bunden og kører:

   ```bash
   pip install -r requirements.txt
   ```

6. Sørg for, at din OpenAI API-nøgle er sat som miljøvariabel:

   **Bash (i Codespaces-terminal):**
   ```bash
   export OPENAI_API_KEY="din_api_nøgle"
   ```

7. Kør agenten:

   ```bash
   python mini_agent.py
   ```

8. Skriv til agenten i terminalen, fx:

   ```
   Du: Hvad er 2+2?
   Du: Kan du regne 10*15+3 med dit værktøj?
   Du: stop
   ```

---

## 3. Sådan kører du projektet lokalt på din egen computer (Windows)

1. Sørg for at have Python installeret (https://python.org), og sæt flueben ved
   **"Add Python to PATH"** under installation.

2. Lav en mappe, fx:

   ```
   C:\projekter\langchain-agent
   ```

3. Læg filerne fra dette projekt ind i mappen.

4. Åbn en PowerShell/terminal i mappen og opret et virtuelt miljø:

   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

5. Installér afhængigheder:

   ```powershell
   pip install -r requirements.txt
   ```

6. Sæt din OpenAI API-nøgle som miljøvariabel (én gang pr. session):

   ```powershell
   $env:OPENAI_API_KEY="din_api_nøgle"
   ```

7. Kør agenten:

   ```powershell
   python mini_agent.py
   ```

---

## 4. Brug af agenten

Når du kører `mini_agent.py`, får du en lille chat i terminalen.
Eksempler på beskeder:

- `Hvad kan du?`
- `Regn 10*25 + 100 ud med dit værktøj`
- `Forklar kort hvad en agent er i LangChain`
- `stop` for at afslutte.

---

## 5. Udvidelser (idéer til næste skridt)

- Tilføj flere tools (f.eks. dato-/tids-opslag, fil-læsning osv.)
- Gem samtalehistorik i en tekstfil eller database
- Kombinér med dine egne data (PDF'er, noter, opskrifter m.m.)
- Byg en web-frontend (FastAPI/Streamlit) rundt om agenten

God fornøjelse med at lege videre med LangChain-agenten! 🚀
