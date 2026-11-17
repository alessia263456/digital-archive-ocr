# Jurnal AI — proiect1 (`digital-archive-ocr`)

Jurnal de bord al interacțiunilor cu asistenții AI conform cerințelor de curs. Înregistrează deciziile de arhitectură, interviul cu clientul, clarificările de scope și evoluția registrului de cunoștințe (ledger).

---

## 2026-11-14 · Interviu de domeniu și extragerea Nomenclatorului Arhivistic
**Unealta:** Claude Code + Sonnet 4.6
**Ce am cerut (pe scurt):** Realizarea interviului operațional cu secretarul notarial / arhivarul unui cabinet notarial individual conform cerințelor din `docs/brief.md`, structurarea răspunsurilor în `INTERVIEW.md` și extragerea termenelor legale de păstrare din Nomenclatorul Arhivistic Notarial scanat primit de la cabinet.
**Ce am primit:** Documentul `INTERVIEW.md` completat cu fluxul zilnic de căutare (registru manual, opis alfabetic), inventarul datelor PII expuse în actele notariale, cerința critică de afișare a numărului de dosar fizic pe cotor (`Număr de Dosar`), protocolul de testare cu 5 căutări reale, precum și fișierul `docs/nomenclator_arhivistic.csv` conținând 25 de categorii de documente cu indicative (IA/IB), termene de retenție, mențiuni C.S. și baza legală de calcul a timpului.
**Ce am făcut cu ea:** Am revizuit și validat datele extrase din interviu, am stabilit legătura dintre actul fizic și cel digital, am adăugat fișierele în repository și am definit vocabularul inițial pentru datele cu caracter personal și Nomenclatorul Arhivistic.

---

## 2026-11-16 · Inițializare Stack, Ledger Graffino și Deciziile D-001 – D-006
**Unealta:** Claude Code + Sonnet 4.6
**Ce am cerut (pe scurt):** Inițializarea structurii de guvernanță a proiectului (Graffino Agentic Setup), configurarea regulilor din `AGENTS.md`, `CONTEXT.md`, definirea primelor întrebări în `OPEN-QUESTIONS.md` și formalizarea deciziilor tehnice de bază (`D-001` – `D-006`).
**Ce am primit:** Structura completă `docs/agents/` cu fișierele de decizii, întrebări deschise, pattern-uri, contracte și unealta `docs/agents/tools/ledger-lint.py`; formularea deciziilor: stack React + Laravel + PostgreSQL + Docker (`D-001`), capabilități nucleu arhivă digitală (`D-002`), teste backend PHPUnit (`D-003`), Tesseract OCR cu pachetul `ron` și coordonate TSV bounding box (`D-004`), pipeline detecție PII cu checksum CNP/IBAN, ancore contextuale notariale și ardere pixeli (`D-005`), testare vizuală frontend cu Playwright (`D-006`).
**Ce am făcut cu ea:** Am confirmat deciziile tehnice de arhitectură, am verificat integritatea ledger-ului rulând `ledger-lint.py` și am pregătit proiectul pentru etapa de clarificare a cerințelor funcționale.

---

## 2026-11-17 · Interviu de clarificare (/grill-me), Scope și Deciziile D-007 – D-020
**Unealta:** Antigravity CLI / IDE (agy) + Claude Sonnet 4.6 (`/grill-me` și generare `README.md`, `CONTEXT.md`, `OPEN-QUESTIONS.md`, `DECISIONS.md`).
**Ce am cerut (pe scurt):** Interviu pas cu pas pentru a defini scope-ul aplicației în `README.md`, completarea termenilor în `CONTEXT.md`, marcarea punctelor neclare ca `Q-` în `OPEN-QUESTIONS.md` și propunerea deciziilor tehnice și de business (`D-007` – `D-020`).
**Ce am primit:** Un set de întrebări punctuale despre roluri, fluxul OCR/PII, retenție, deduplicare, carantină și ecranele aplicației, urmat de ciorna pentru `README.md`, întrebările `Q-008`–`Q-012` și propunerile de decizii `D-007` – `D-020`.
**Ce am făcut cu ea:** Am răspuns la întrebările din interviu, am marcat structura folderelor pe indicative arhivistice (`Q-008`) și integrarea Figma (`Q-009`) ca întrebări deschise fără să inventez răspunsuri, am ajustat **D-008** astfel încât `secretar notarial` să împartă rolul `arhivar` (restul personalului rămânând pe `cititor`), am restricționat Dashboard-ul (`D-020`) exclusiv la `admin` și `arhivar`, și am rulat `ledger-lint.py` pentru validare.
