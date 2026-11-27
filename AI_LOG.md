# Jurnal AI — proiect1 (`digital-archive-ocr`)

Jurnal de bord al interacțiunilor cu asistenții AI conform cerințelor de curs. Înregistrează deciziile de arhitectură, interviul cu clientul, clarificările de scope și evoluția registrului de cunoștințe (ledger).

## 2026-11-27 · P22-31, P22-32 și P22-33 · Permisiuni și API de căutare

**Unealta:** OpenAI Codex, Docker Compose, PostgreSQL și PHPUnit.

**Ce am cerut:** Implementarea backend-ului pentru Folder Permissions, indexarea full-text în română și API-ul de navigare/căutare, exclusiv în worktree-ul `/tmp/proiect1-m3-backend`, fără modificări frontend și cu PostgreSQL izolat.

**Ce am primit:** Migrare pentru permisiuni la nivel de rol și utilizator, cu acces implicit refuzat și prioritate pentru permisiunea individuală; proiecții de căutare separate pentru personal și `cititor`, cu indexuri GIN românești și reindexarea versiunii aprobate curente; endpoint-urile protejate `GET /api/archive/browse` și `GET /api/documents`, cu filtrarea permisiunilor înainte de rezultate, numărători și paginare. Proiecția pentru `cititor` elimină valorile acceptate pentru Redaction și exclude tag-urile. Ecranul DS-001 și administrarea permisiunilor rămân în afara acestei sesiuni.

**Verificare:** Migrațiile au trecut pe PostgreSQL curat, iar PHPUnit a trecut cu 183 teste și 1.445 aserțiuni; 3 teste au rămas skipped. Acoperirea include precedența permisiunilor, căutarea românească, protecția proiecției cititorului, highlight-uri, filtre, paginare și înlocuirea atomică a indexului la publicarea unei versiuni noi. Verificarea a folosit proiectul Compose `p22m3backend`, porturile 15432/18031 și bazele `archive_p22m3`/`archive_p22m3_test`; containerele, volumele și secretele temporare au fost eliminate după rulare.

Implementarea backend a pornit de la baza cerută `f0c2023` și a fost înregistrată în commitul `8489a09`. `git diff --check` a trecut. `git fetch --all --prune` nu a putut scrie în metadatele Git partajate și read-only ale worktree-ului linked. Nu au fost modificate fișiere frontend sau fișierele Ledger.

## 2026-11-27 · DS-001 · Căutare și navigare în arhivă

**Unealta:** OpenAI Codex, Docker Compose și Playwright.

Am implementat frontend-ul DS-001 pe baza machetei HTML/CSS/JavaScript aprobate, într-un worktree și pe ramura `feat/ds-001-search-browse`. Ecranul păstrează navigarea după tip, dosar și an, iconurile de dosar, acțiunile „Vezi toate” și documentele recente. Căutarea include filtre, număr total de rezultate, sortare după relevanță/dată, evidențierea potrivirilor, paginare și ștergerea filtrelor. Câmpurile Etichete și Nume din acte sunt disponibile doar pentru Admin și Arhivar; Cititor primește doar textul sigur pentru citire. Datele și accesul la catalog sunt separate de componentele React și folosesc date sintetice provizorii, deoarece C-008 lipsește din checkout. Nu s-a creat sau modificat un contract și nu s-a conectat API-ul real.

Integrarea folosește AppShell existent. Conflictul din `main.jsx` a fost rezolvat păstrând modificările DS-011 mai noi și adăugând doar importul și selectarea ecranului DS-001. Macheta și testul său de interacțiuni au fost extinse, iar registrul DS-001 a fost actualizat la implementarea frontend curentă. Nu s-au modificat backend-ul, baza de date sau migrațiile.

**Verificare:** Build-ul frontend integrat a trecut; testele Playwright focalizate DS-001 au trecut cu 28/28 pe desktop și mobil, în teme luminoasă și întunecată. Testele machetei aprobate au trecut cu 4/4, iar Ledger lint a trecut. Rularea completă frontend a avut 184 teste: 145 passed, 24 skipped și 15 failed. O parte dintre eșecuri provin din teste existente care presupun o arhivă goală, incompatibilă cu datele sintetice aprobate; au mai fost raportate un timeout la așteptarea fonturilor în captura upload și un timeout în testul cozii. Un locator ambiguu din testul nou DS-001 a fost corectat, după care suita focalizată a trecut. Capturile home și rezultate DS-001 light/dark sunt în `docs/design/screens/`.

Commiturile locale sunt `baeab2b` (implementarea pe ramura feature) și `230240e` (integrarea în `main`). Nu s-a făcut push sau deploy; integrarea API și C-008 rămân separate.

## 2026-11-27 · P22 DS-011 · Corecturi editor, publicare și verificare manuală

**Unealta:** OpenAI Codex, Docker Compose, PHPUnit și Playwright.

Am continuat corecturile aprobate pentru DS-011: anonimizările automate cu geometrie sigură sunt incluse implicit, eliminarea și undo sunt păstrate pe revizia curentă, iar detectările fără localizare sigură sunt omise fără să blocheze previzualizarea sau publicarea. Au fost corectate fluxurile de acceptare a detectărilor incerte, generarea și comutarea previzualizării anonimizate, mesajele popup, salvarea OCR și crearea dosarelor de către `admin` și `arhivar`. C-005/C-007 au fost amendate în Ledger, iar deciziile și planurile aferente au fost consemnate; D-022 și D-038 au rămas neschimbate.

La publicarea documentelor `TEST-017-incheiere-pag2.jpg` și `TEST-017-incheiere-pag1.jpg`, jurnalul backend a identificat cauza mesajului generic de siguranță: textul OCR corectat de pe o pagină nu se putea asocia complet cu geometria cuvintelor. Publicarea indexează acum pagina respectivă fără text pentru `cititor` când alinierea nu poate fi demonstrată sigur; textul rămâne disponibil personalului, iar textul incert nu ajunge în căutarea cititorului. Proprietara a confirmat că publicarea funcționează conform așteptărilor.

**Verificare:** PHPUnit a trecut cu 188 teste, 1.493 aserțiuni și 3 skipped; suita concentrată de proiecție/publicare a trecut cu 15 teste și 169 aserțiuni. Playwright a trecut cu 216 teste, iar 28 verificări opt-in ale API-ului real au rămas skipped. Ledger lint și `git diff --check` au trecut. Backend-ul local a fost reconstruit și repornit. Funcționalitățile par să funcționeze; interfața Editor DS-011 trebuie revizuită separat. Nu s-a făcut push sau deploy.

## 2026-11-26 · P22-24a, P22-24b și P22-45 · Editor OCR și cozi DS-004

**Unealta:** OpenAI Codex, Docker Compose, PHPUnit și Playwright.

**Ce am cerut:** Implementarea planului aprobat `p22-24a-24b-45-ds011-editor-queue.md`, verificare manuală, apoi integrarea și publicarea modificărilor.

**Ce am primit:** DS-011 permite corectarea OCR păstrată separat de rezultatul sursă, detectarea PII pe textul corectat și revizuirea protejată a candidaților cu verificări de revizie. DS-004 deschide sau reia ciorna selectată în editor. Potrivirile cu localizare nesigură cer verificare manuală și nu primesc casete pentru anonimizare automată. Etapele ulterioare DS-011 pentru metadate, desenarea și previzualizarea anonimizării, aprobarea finală și publicarea versiunii imuabile rămân deschise.

**Verificare:** PHPUnit a trecut cu 142 teste, 1.083 aserțiuni și 3 teste OCR-only skipped. Playwright a trecut cu 132 teste și 24 verificări opt-in ale API-ului real skipped în rularea implicită. Ledger lint și `git diff --check` au trecut. Capturile DS-011 desktop și mobil la 320px, în temă luminoasă și întunecată, au fost salvate în `docs/design/screens/`.

La testarea aplicației pornite, jurnalul backend a identificat lipsa coloanei `corrected_ocr`; migrarea editorului și cele două migrații additive pendinte anterior au fost aplicate în ordine cu `php artisan migrate --force`, apoi starea a fost verificată cu `migrate:status`. Modificările au fost înregistrate în commiturile `1f5dbfb` și `73ba25c`; checklist-ul marchează P22-24a, P22-24b și P22-45 complete. Ramura a fost integrată în `main` și publicată pe `origin` la cererea proprietarului.

## 2026-11-25 · P22 M1a.4 · Integrare și verificarea etapei

**Unealta:** OpenAI Codex, Docker Compose, PHPUnit și Playwright.

**Ce am cerut:** Implementarea planului aprobat M1a.4, cu verificarea fluxului real upload–OCR–previzualizare, instrucțiuni de provisionare Admin fără parolă implicită și dovezi pentru checklist.

**Ce am primit:** Workflow-ul frontend rulează acum și la pull request. Am adăugat un test Playwright opt-in pentru API-ul real și o procedură reproductibilă într-un proiect Compose izolat, cu volum propriu, cont Admin sintetic și fișier de test montat read-only. README-ul descrie comanda interactivă Admin și pașii de verificare și curățare. Descrierea din `ARCHITECTURE.md` era deja aliniată cu implementarea protejată OCR/preview, deci nu a fost modificată.

**Verificare:** Fluxul real a autentificat Admin-ul sintetic, a încărcat imaginea românească, a citit starea salvată prin acțiunea explicită, a afișat textul „Știință și cultură în România”, încredere medie de 85% și cinci Bounding Boxes, apoi a livrat preview-ul. Baza izolată conține evenimentele `ocr_results_viewed` și `preview_issued`. Introducerea parolei în prompt, câmp cu câmp, nu a afișat-o; verificarea logurilor backend/worker nu a găsit username-ul sintetic, text OCR, indicatori de parolă, XSRF sau sesiune.

PHPUnit: 89 teste, 530 aserțiuni, 3 skipped. Build-ul frontend și Playwright: 64 trecute, 8 skipped; testul real separat: 1 trecut. Capturile existente DS-001, DS-003 și DS-011 au fost inspectate în teme și dimensiuni reprezentative.

Prima probă izolată a identificat configurarea necesară a discului: `DOCUMENTS_DISK=documents` folosește volumul montat comun, iar volumul nou trebuie să aparțină utilizatorului `www-data`. Instrucțiunile README au fost corectate și fluxul a trecut la repetare. Proprietarul a confirmat acceptanța fluxului real la 2026-11-25. P22-36a rămâne deschis: inserarea evenimentelor este demonstrată, dar schema și testele actuale nu demonstrează interzicerea modificării sau ștergerii rândurilor.

## 2026-11-24 · P22 M1a.1 · Autentificare și fundația aplicației

**Unealta:** OpenAI Codex, Docker Compose și Playwright.

**Ce am cerut:** Implementarea planului aprobat pentru autentificare cu sesiuni Sanctum, DS-010, starea goală inițială DS-001 și verificarea backend/frontend.

**Ce am primit:** Login/logout cu sesiuni server-side, protecție CSRF, expirare la 30 de minute fără activitate și maximum 12 ore, oprirea token-urilor bearer pentru aplicație, creare interactivă și sigură a primului cont Admin, proxy same-origin pentru Vite/Caddy și cele două ecrane React. Pentru DS-001 am ales text explicativ fără link către ecranul de încărcare.

**Verificare:** PHPUnit 82 teste și 471 aserțiuni (3 teste existente skipped); Playwright 28 teste pentru desktop/mobil și teme luminoasă/întunecată; testul suplimentar cu API-ul Laravel real a trecut în toate cele patru proiecte. Verificările Compose/Caddy, Ledger lint și `git diff --check` au trecut. Capturile desktop și mobil la 320×740 și 1600×900 au fost inspectate și salvate în `docs/design/screens/`.

Un test real a găsit că `.dockerignore` excludea config-ul Vite și fonturile publice din imagine; am inclus acele intrări și am repetat build-ul și verificările. Tabela `sessions` exista deja în migrarea scaffold-ului, deci nu am adăugat o migrare duplicată. Timpul Codex a fost aproximativ 1 h 15 min scurs, timpul activ nu a fost măsurat separat.

Proprietara a confirmat verificarea manuală locală: login cu date valide și invalide, persistența sesiunii, logout, accesul la pagina protejată și aspectul ecranelor implementate. P22-35 și revizuirea M1a.1 au fost închise.

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

## 2026-11-21 · P22-06a · Rasterizarea documentelor

Codex a implementat planul aprobat pentru PDF, JPG și PNG, cu publicarea atomică a paginilor și limite de timp, memorie și volum. Primele 16 teste au eșuat deoarece serviciul lipsea. La prima rulare după implementare, două teste au arătat că procesele copil nu primeau calea executabilelor de test. După corectare, suita completă a trecut cu 20 de teste și 77 de aserțiuni. Verificarea OCR în limba română a trecut. Geometria documentelor reprezentative rămâne pentru P22-06b.

## 2026-11-22 · P22-11 și P22-56b · Signed URL, verificări live și finalizare

**Unealta:** OpenAI Codex, Docker Compose, SSH și verificările Chrome DevTools ale proprietarului.

Am investigat răspunsul HTTP 403 pentru Signed URL. Laravel nu avea Caddy configurat ca proxy de încredere și reconstruia schema cererii ca HTTP, deși URL-ul era semnat absolut pentru HTTPS. Am limitat antetele proxy de încredere la rețeaua bridge Docker `172.16.0.0/12` și am adăugat teste pentru livrare HTTPS validă (200), URL expirat și modificat (403), gazdă modificată și antete spoofed de la un peer neîncrezător. Rețeaua live `172.19.0.0/16` se află în intervalul configurat.

Proprietarul a autorizat deploy-ul reviziei `f089e2c43f1c287450076e56ffc966296d71822b`. Aceasta a fost transferată privat în Azure; a fost reconstruit și recreat numai serviciul backend. Backend-ul a devenit healthy, iar containerele Caddy și PostgreSQL au rămas neschimbate. Configurația privată, TLS și rollback-ul placeholder au fost păstrate. HTTP a redirecționat către HTTPS (308), certificatul HTTPS a fost valid, iar accesul anonim la frontend, health și API a primit 401.

Proprietarul a raportat că proba live Signed URL a trecut: livrare validă, respingere pentru URL expirat și modificat și curățarea obiectului sintetic. Verificările autentificate au returnat frontend 200, health 200 și fallback API 404. În Chrome DevTools, interfața React s-a randat; JavaScript-ul `index-DOxFgDtR.js` și CSS-ul `index-DV9xApkK.css` au returnat 200, iar documentul HTML principal a returnat 304 din cache. P22-11 și P22-56b au fost marcate complete în checklist. Testele PHPUnit, verificările de configurare, linterul Ledger și `git diff --check` au trecut. Checklist-ul a fost actualizat în commiturile locale `ef1c077` și `65ede59`; fixul este în `f089e2c`. Nu s-a făcut push.

## 2026-11-27 · P22-21 OCR, anonimizare și siguranța previzualizării

**Unealta:** OpenAI Codex, Docker Compose, PHPUnit și Playwright.

Am cerut continuarea planului aprobat pentru asocierea cuvintelor OCR corectate cu Bounding Box-urile originale, păstrând textarea liberă DS-011 și corecturile existente din frontend. Codex a implementat operații de editare cu offset-uri UTF-16, validate și reaplicate pe backend, asocieri derivate din OCR-ul original și proiecția textului sigur pentru cititor. Nu a fost necesară o migrare sau o dependență nouă. Contractul C-004 a fost păstrat ca istoric supersedat de C-005.

Verificarea a acoperit corectarea OCR, detectarea PII, acceptarea potrivirii, generarea PDF-ului privat și proiecția pentru cititor. PHPUnit a trecut cu 160 de teste și 1.168 de aserțiuni, apoi verificarea sintetică pentru trei pagini a trecut cu 2 teste și 15 aserțiuni. Playwright a trecut cu 148 de teste; 24 de verificări API reale au rămas opt-in. Build-ul React, linterul Ledger și capturile DS-011 pentru desktop și mobil, în temele deschisă și întunecată, au trecut inspecția.

În testarea locală, documentele nu s-au previzualizat și încărcările au eșuat după pornirea backend-ului cu discul local `documents`, în timp ce ciornele existente foloseau R2. Discul R2 a fost verificat prin proba de scriere, citire, semnare și ștergere, apoi backend-ul și worker-ul au fost repornite cu configurația R2. Un PDF și o colecție JPG au fost rasterizate, iar dimensiunile paginilor au corespuns OCR-ului.

Salvarea corecturilor OCR a returnat HTTP 422 deoarece middleware-ul Laravel transforma șirurile goale și elimina spațiile din operațiile textarea. Excepția middleware-ului a fost limitată la ruta de salvare OCR. Testul de regresie a reprodus eroarea înainte de fix; suita PHPUnit a trecut apoi cu 162 de teste și 1.184 de aserțiuni, cu trei teste OCR-worker omise în acel mediu.

Schimbările au fost înregistrate local în commiturile `fbd22c9`, `fdf688b`, `58239ac` și `bdfd54c`, apoi integrate prin fast-forward în ramura locală `main`. Nu s-a făcut push sau deploy.
