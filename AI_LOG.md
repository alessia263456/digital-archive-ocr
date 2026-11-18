# Jurnal AI — proiect1 (`digital-archive-ocr`)

Jurnal de bord al interacțiunilor cu asistenții AI conform cerințelor de curs. Înregistrează deciziile de arhitectură, interviul cu clientul, clarificările de scope și evoluția registrului de cunoștințe (ledger).

## 2026-11-17 · Interviu de clarificare (/grill-me), Scope și Deciziile D-007 – D-020
**Unealta:** Antigravity CLI (agy) (`/grill-me` și generare `README.md`, `CONTEXT.md`, `OPEN-QUESTIONS.md`, `DECISIONS.md`).
**Ce am cerut (pe scurt):** Interviu pas cu pas pentru a defini scope-ul aplicației în `README.md`, completarea termenilor în `CONTEXT.md`, marcarea punctelor neclare ca `Q-` în `OPEN-QUESTIONS.md` și propunerea deciziilor tehnice și de business (`D-007` – `D-020`).
**Ce am primit:** Un set de întrebări punctuale despre roluri, fluxul OCR/PII, retenție, deduplicare, carantină și ecranele aplicației, urmat de ciorna pentru `README.md`, întrebările `Q-008`–`Q-012` și propunerile de decizii `D-007` – `D-020`.
**Ce am făcut cu ea:** Am răspuns la întrebările din interviu, am marcat structura folderelor pe indicative arhivistice (`Q-008`) și integrarea Figma (`Q-009`) ca întrebări deschise fără să inventez răspunsuri, am ajustat **D-008** astfel încât `secretar notarial` să împartă rolul `arhivar` (restul personalului rămânând pe `cititor`), am restricționat Dashboard-ul (`D-020`) exclusiv la `admin` și `arhivar`, și am rulat `ledger-lint.py` pentru validare.

## 2026-11-18 · Configurare Figma, Integrare MCP, Design Tokens și Registru Ecrane (DS-001 – DS-011)
**Unealta:** Antigravity CLI (agy).
**Ce am cerut (pe scurt):** 
1. Conectarea proiectului extern Figma în documentație și configurarea acestuia prin protocolul MCP (Model Context Protocol).
2. Interviu de stil vizual (culori, fonturi, ton, website-uri de referință), propunerea setului complet de token-uri de design în `docs/design/DESIGN.md` ca PROPOSAL și aplicarea lor după confirmare.
3. Ajustarea fonturilor propuse inițial către opțiuni cu lizibilitate superioară pe ecran.
4. Popularea registrului de ecrane în `docs/design/registry.yaml` cu separarea vizualizării documentelor de editarea și anonimizarea lor.
**Ce am primit:** 
- Conectarea link-ului Figma în `docs/design/DESIGN.md` și `README.md`, închiderea `Q-009` și configurarea serverului oficial Figma MCP (`https://mcp.figma.com/mcp`).
- Un interviu axat pe identitatea vizuală a cabinetului notarial și a arhivei, urmat de propunerea token-urilor bazate pe paleta Solstice (`#072D5C`, `#4683CF`, `#46CFC3`, `#CE8946`), fundal pergament cald/piatră (`#FAF8F5`) și dark mode (`#1E293B`).
- Variante alternative de fonturi optimizate pentru citire pe ecran, fiind selectată combinația Plus Jakarta Sans (titluri), Public Sans (corp/UI) și Fira Code (date/OCR TSV).
- Structurarea celor 11 ecrane ale aplicației în `docs/design/registry.yaml`, decuplând vizualizatorul read-only (`DS-002`) de editorul dedicat (`DS-011`) și formalizând ecranul de Login (`DS-010`).
- Propunerea formală prin mecanismul de gate pentru actualizarea deciziei **D-020** și a tabelului de ecrane din `README.md`.
**Ce am făcut cu ea:** Am confirmat selecția de fonturi (Pairing #2), am aprobat propunerile de modificare a token-urilor și actualizarea deciziei **D-020** la inventarul de 11 ecrane, iar linterul de ledger (`ledger-lint.py`) a fost rulat cu succes fără erori.
