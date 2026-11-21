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

## 2026-11-19 · Solstice, aprobarea vizualizatorului DS-002 și sincronizarea Figma

**Unealta:** OpenAI Codex, Figma MCP, Playwright și GitHub CLI.

**Ce am cerut (pe scurt):** O tipografie mai simplă pentru Solstice, revizuirea machetei DS-002 în ambele teme, înregistrarea aprobării, deschiderea unui PR către `main` și actualizarea machetelor din Figma.

**Ce am primit:**

- Public Sans pentru interfață și Fira Code rezervat identificatorilor tehnici, coordonatelor OCR, hash-urilor și altor date monospațiate.
- Un antet compact cu numele documentului, numărul de dosar pe o etichetă bronz și acțiunea **Editează**. Selectorul **Original / Anonimizat** plutește centrat, iar căutarea, descărcarea și partajarea au butoane separate.
- Panoul de metadate a fost eliminat. Căutarea în document evidențiază potrivirile din versiunea afișată, cu numărătoare și navigare între rezultate. Macheta caută în singura pagină de exemplu pe care o redă.
- Token-uri semantice pentru etichetele arhivistice. Selectorul folosește bleumarin pentru **Original**, turcoaz pentru **Anonimizat** și fundal neutru pentru opțiunea inactivă. Miniaturile paginilor sunt deschise implicit.
- Verificări Playwright în ambele teme la 320, 768, 1024 și 1440 px pentru căutare, redactare, restricțiile de rol și contrast. Verificările ledger și Git au trecut.

**Ce am făcut cu ea:** Am confirmat macheta DS-002, iar registrul și macheta afișează starea `approved`. Datele de identificare din exemplu au fost înlocuite cu date fictive înainte de commitul `5b7eef9`. Ramura `fix/ds-002-typography` a fost publicată, iar [PR-ul #1](https://github.com/alessia263456/digital-archive-ocr/pull/1) a fost deschis către `main`. După instalarea și autorizarea modulului Figma, am regenerat și verificat cadrele editabile [luminos](https://www.figma.com/design/r5IWZRotEZKlAGFdzwnPlx/arhiva-digitala-ocr-Design?node-id=13-2) și [întunecat](https://www.figma.com/design/r5IWZRotEZKlAGFdzwnPlx/arhiva-digitala-ocr-Design?node-id=13-52).

## 2026-11-19 · Clarificarea cerințelor și alinierea documentației

**Unealta:** OpenAI Codex, Git și Chromium.

**Ce am cerut (pe scurt):** Revizuirea README-ului, vocabularului, întrebărilor deschise și machetelor. Am cerut să discutăm câte o întrebare, apoi să înregistrăm răspunsurile și să actualizăm documentația și macheta de partajare. Am păstrat interviul original.

**Ce am primit:**

- Deciziile D-021–D-029, cu aprobarea obligatorie a revizuirii PII înainte de salvare, ciorne private, metadate obligatorii și indexarea ultimei versiuni aprobate. Documentele pot fi consultate după dosar fizic, tip sau an. Permisiunile pe dosar se aplică rolului `cititor`, care poate căuta în textul anonimizat al documentelor aprobate.
- Reguli pentru partajarea unei versiuni precise în PDF original sau anonimizat, cu parolă opțională, dată de expirare prestabilită sau personalizată, revocare și audit. Macheta DS-002 ilustrează opțiunile de expirare și parolă.
- Avertizare la coincidența numărului și datei actului, blocare la hash SHA-256 identic și trimitere în Carantină după eșecul OCR inițial și trei reîncercări eșuate. Casarea confirmată de Admin șterge documentul și versiunile sale, iar jurnalul păstrează dovezile pe termen nelimitat.
- Șablonul `CORPUS.md` pentru 30 de documente completate cu date de test. Secretarul Notarial va rula cinci căutări de acceptanță în mediul live. Inventarul așteaptă lista șabloanelor.
- Patru întrebări deschise (Q-013–Q-016) despre aprobarea machetelor rămase, evenimentele de retenție viitoare, detaliile de audit pentru accesul extern și corectarea directă a indicativului arhivistic.

**Ce am făcut cu ea:** Am confirmat deciziile și macheta DS-002 revizuită. Am înregistrat corectarea rolurilor în `19d134d` și alinierea deciziilor, documentației și designului în `1e759db`. Verificarea registrului, linterul și `git diff --check` au trecut.

## 2026-11-19 · Planificarea schemei PostgreSQL și aprobarea etapei Archive Foundations

**Unealta:** OpenAI Codex, Git și linterul Ledger.

**Ce am cerut (pe scurt)** — Am cerut un plan pentru schema bazei de date prin procedura `/plan`. Am împărțit propunerea în etape și am pregătit pentru aprobare doar prima etapă, Archive Foundations.

**Ce am primit**

- O propunere în șase etape: fundația arhivei, ciorne și versiuni, permisiuni și căutare, jurnal de audit, linkuri de partajare, retenție și casare.
- Un [plan detaliat pentru prima etapă](docs/agents/plans/part-1-archive-foundations.md), cu tabele pentru conturi, dosare fizice și nomenclatorul arhivistic. Am clarificat că un dosar fizic poate conține mai multe documente digitale, fiecare cu propriul istoric de versiuni.
- O decizie de planificare pentru importul inițial al celor 49 de intrări din CSV-ul existent în PostgreSQL. Aplicația va consulta baza de date după import. Planul prevede teste PHPUnit pe PostgreSQL pentru constrângeri, fidelitatea importului și revenirea la starea inițială dacă importul eșuează.
- Trei [întrebări deschise](docs/agents/questions/notarial-nomenclature.md): Q-017 despre aplicarea reviziilor oficiale și păstrarea regulilor istorice, Q-018 despre accesul de citire pentru `arhivar` și Q-019 despre un ecran dedicat consultării nomenclatorului și importului actualizărilor din CSV.

**Ce am făcut cu ea** — Am confirmat D-007 și D-017 și am ajustat planul și apoi am aprobat forma lui finală pentru prima etapă.

## 2026-11-20 · P22-01 · Verificarea OCR în limba română

**Unealta:** OpenAI Codex, Docker Compose și Tesseract.

**Ce am cerut** — Implementarea planului aprobat pentru containerul OCR, cu o imagine sintetică și verificări ale textului și coordonatelor TSV.

**Ce am primit** — Serviciul `ocr-worker` a extras „Știință și cultură în România” cu Tesseract 5.3.0 și modelul `ron`. Verificarea a acceptat cele cinci casete de delimitare și a respins antetul TSV incorect, lipsa unui cuvânt, coordonata negativă, înălțimea zero și depășirea limitelor imaginii. Linterul Ledger a trecut.

## 2026-11-20 · P22-04 · Coordonarea predării și a testării

Am aprobat planul și i-am cerut lui Codex să strângă detaliile despre predarea șabloanelor, accesul la găzduire, cele două programări cu Secretarul Notarial și predarea proiectului la curs. Confirmările se consemnează în [lista de sarcini](docs/agents/plans/p22-task-checklist.md).

Codex a consemnat stadiul corpusului, intervalul disponibil pentru căutările de acceptanță și cerințele de predare pe care le-am furnizat. Pentru găzduire, am discutat oferta Azure for Students și alternativa Oracle Cloud Always Free. Am activat abonamentul Azure for Students, am creat mașina virtuală și am confirmat numele de gazdă, accesul SSH și drepturile de administrator. Voi stabili sesiunea de căutări cu Secretarul Notarial când aplicația este disponibilă online, înainte de 4 decembrie, și voi consemna rezultatele în `INTERVIEW.md`.

## 2026-11-20 · P22-56a · Verificarea găzduirii temporare

Codex a instalat Docker și a configurat Caddy pe mașina virtuală după aprobarea proprietarului. Redirecționarea HTTP a funcționat pe server. Conexiunile externe și validarea certificatului au expirat. Containerul a fost oprit, iar verificarea regulilor Azure rămâne deschisă.

După ce am permis traficul către porturile 80 și 443, Codex a repornit Caddy și a verificat certificatul public, redirecționarea HTTP și autentificarea. Chromium a afișat „Hello World” după autentificare. Verificările au trecut și după recrearea containerului cu același volum și certificat.

## 2026-11-21 · P22-03 · React și Playwright

**Unealta:** Codex CLI.

**Ce am cerut:** Implementarea planului aprobat, cu testele scrise înaintea codului React și verificarea în Docker.

**Ce am primit:** Un proiect React minimal și o comandă Compose care compilează proiectul și rulează Chromium pe desktop și mobil, în mod luminos și întunecat. GitHub Actions folosește aceeași comandă.

**Verificare:** În prima rulare, titlul lipsea în toate cele patru configurații. După implementare, aceleași teste au trecut. Cele patru capturi au fost inspectate. PHPUnit și verificarea registrului au trecut local. Prima rulare găzduită în GitHub Actions așteaptă autorizarea publicării ramurii.
