# Jurnal AI — proiect1 (`digital-archive-ocr`)

Jurnal de bord al interacțiunilor cu asistenții AI conform cerințelor de curs. Înregistrează deciziile de arhitectură, interviul cu clientul, clarificările de scope și evoluția registrului de cunoștințe (ledger).

## 2026-11-17 · Interviu de clarificare (/grill-me), Scope și Deciziile D-007 – D-020
**Unealta:** Antigravity CLI (agy) (`/grill-me` și generare `README.md`, `CONTEXT.md`, `OPEN-QUESTIONS.md`, `DECISIONS.md`).
**Ce am cerut (pe scurt):** Interviu pas cu pas pentru a defini scope-ul aplicației în `README.md`, completarea termenilor în `CONTEXT.md`, marcarea punctelor neclare ca `Q-` în `OPEN-QUESTIONS.md` și propunerea deciziilor tehnice și de business (`D-007` – `D-020`).
**Ce am primit:** Un set de întrebări punctuale despre roluri, fluxul OCR/PII, retenție, deduplicare, carantină și ecranele aplicației, urmat de ciorna pentru `README.md`, întrebările `Q-008`–`Q-012` și propunerile de decizii `D-007` – `D-020`.
**Ce am făcut cu ea:** Am răspuns la întrebările din interviu, am marcat structura folderelor pe indicative arhivistice (`Q-008`) și integrarea Figma (`Q-009`) ca întrebări deschise fără să inventez răspunsuri, am ajustat **D-008** astfel încât `secretar notarial` să împartă rolul `arhivar` (restul personalului rămânând pe `cititor`), am restricționat Dashboard-ul (`D-020`) exclusiv la `admin` și `arhivar`, și am rulat `ledger-lint.py` pentru validare.
