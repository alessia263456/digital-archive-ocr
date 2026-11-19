# Project Specifications — digital-archive-ocr

# P22 — Arhivă digitală cu OCR și redactare PII

* **Categorie:** E. Integrări \& fișiere
* **Dificultate:** ★★★★ (\~38h)
* **Runda:** 1 (1 student)

## Pe scurt

Sistem de gestiune a documentelor pentru o organizație reală cu hârtii (asociație, parohie, secretariat, cabinet, mică firmă): upload în masă, OCR în română, căutare full-text, detecția și redactarea datelor personale, versiuni, permisiuni pe foldere și retenție.

## Input uman obligatoriu

O organizație reală cu arhivă pe hârtie. Pentru validare, folosești 30 de șabloane furnizate de Secretarul Notarial și completate cu date de test. Corpusul include tipuri și calități diferite, inclusiv exemple de scris de mână, și exclude documentele oficiale ale cabinetului. Interviu cu persoana care ține arhiva: cum caută un document azi, cine are voie să vadă ce, cât timp trebuie păstrate, ce se întâmplă cu CNP-urile din ele.

* Livrabile dovadă: `INTERVIEW.md` + [CORPUS.md](../CORPUS.md) (descrierea celor 30 de documente).

## Context real

Dosarele sunt în dulap. Când cineva cere „contractul cu firma X din 2019”, durează o oră. Documentele conțin CNP-uri, telefoane și IBAN-uri care nu ar trebui să fie vizibile oricui. Nimeni nu știe ce trebuie distrus după 5 ani.

## Cerințe funcționale (must)

* **Upload în masă \& status asincron:** drag \& drop pentru PDF / JPG / PNG / DOCX, cu procesare asincronă și stare vizibilă pentru fiecare document. Încărcările incomplete rămân ciorne private care pot fi reluate. Pentru DOCX, se păstrează originalul și se generează un PDF pentru vizualizare, anonimizare și partajare.
* **OCR în română:** Tesseract cu pachetul de limbă română, text extras și coordonate TSV păstrate alături de original. Corecțiile textului OCR se fac în DS-011.
* **Căutare full-text:** evidențiere în rezultate, filtre (folder, tip, dată, etichete), sortare după relevanță și afișarea numărului dosarului fizic în fiecare rezultat. Căutarea după numele părților este disponibilă pentru `admin` și `arhivar`. Rolul `cititor` poate căuta imediat în textul anonimizat al versiunilor aprobate, pentru orice tip de document din dosarele la care are acces.
* **Extragere de metadate:** sugestii editabile pentru date, sume, numere și etichete. Înainte de salvare și indexare, `admin` sau `arhivar` validează metadatele, inclusiv data actului, numărul actului, numărul dosarului fizic și numărul de inventar. Aplicația atribuie indicativul arhivistic pe baza tipului, subtipului și contextului de arhivare. Personalul poate corecta clasificarea.
* **Detecție și redactare PII:** detectează CNP, IBAN, telefon, email și numele părților. Marchează și adresele, datele actelor de identitate, semnăturile părților, identificatorii cadastrali și ai vehiculelor, precum și CUI/CIF. Păstrează numele, titlul și semnătura notarului public. Fiecare document necesită aprobarea explicită a revizuirii înainte de salvare, inclusiv când nu există potriviri incerte. DS-011 permite marcarea manuală.
* **Permisiuni \& partajare:** aceeași arhivă se poate consulta după dosar fizic, tip sau an. Permisiunile se acordă pe dosar fizic doar pentru `cititor` și se aplică în toate modurile de consultare. Accesul se acordă explicit de către `admin`. Permisiunea individuală are prioritate față de cea a rolului. `admin` și `arhivar` au acces la toate dosarele și pot crea sau revoca linkuri către PDF-ul original ori anonimizat al unei versiuni precise. Linkul poate avea parolă și expiră după 24 de ore, 7 zile, 30 de zile sau la orice dată viitoare aleasă. Verificarea identității și cererea scrisă se gestionează în afara aplicației.
* **Versiuni \& audit:** versiuni imutabile. Versiunea aprobată rămâne vizibilă și căutabilă pe durata revizuirii unei versiuni noi. După aprobare, doar ultima versiune rămâne în index, iar `admin` și `arhivar` pot consulta versiunile anterioare. Jurnalul înregistrează accesările, descărcările, exporturile, modificările, crearea linkurilor și fiecare vizualizare sau descărcare prin link.
* **Politici de retenție:** termenul se calculează conform nomenclatorului, pe baza datei aplicabile confirmate înainte de salvare de `admin` sau `arhivar`. Se grupează documentele expirate după marcajul C.S.; deliberările comisiei au loc în afara aplicației. Adminul poate prelungi termenul și confirmă manual casarea pe loturi. Confirmarea șterge definitiv documentul scanat și toate versiunile.
* **Roluri sistem:** `cititor`, `arhivar`, `admin`.

## Cerințe tehnice specifice P22

* **Pipeline asincron:** coadă și worker separat, retry cu backoff, documente mutate în Carantină după eșecul inițial și încă trei reîncercări eșuate (test obligatoriu cu un fișier corupt).
* **Object storage privat:** fișiere stocate în object storage și servite exclusiv prin URL-uri semnate cu expirare; niciodată URL-uri publice permanente.
* **Full-text search:** PostgreSQL `tsvector` (dicționar românesc); test de relevanță pe corpusul cu date de test.
* **Deduplicare:** un hash SHA-256 identic afișează un avertisment și documentul existent, apoi blochează salvarea. Coincidența dintre numărul și data actului declanșează un avertisment de posibil duplicat. Personalul poate salva ca versiune nouă, salva separat sau renunța.

## Twist: redactarea care nu scapă nimic și auditul care nu minte

* Detecția PII pe text OCR-uit e imperfectă (ex. un CNP citit cu `1` în loc de `I`): regulile trebuie să combine pattern-uri, validare de checksum și context (`"CNP:"` în apropiere), să marcheze incertitudinile pentru revizuire și să producă o versiune **redactată vizual** (pixeli acoperiți în imagine / PDF, nu doar text șters). Textul acoperit se elimină și din PDF, precum și din textul și metadatele disponibile rolului `cititor`.
* În aplicație, originalul este disponibil rolurilor `admin` și `arhivar`. Un destinatar extern poate primi PDF-ul original sau anonimizat prin linkul autorizat.
* Auditul trebuie să fie **append-only** (nici adminul nu poate șterge intrări) și să demonstreze, la o cerere GDPR, toate accesele la un document.
* Nomenclatorul stabilește data de la care curge termenul, de exemplu 1 ianuarie al anului următor datei actului, expirarea contractului, soluționarea dosarului sau eliberarea depozitului. Documentele cu păstrare permanentă nu au termen de casare.

## Variabilele proiectului

1. **Organizația și corpusul:** Cabinet Individual Notarial; 30 de șabloane completate cu date de test.
2. **Regulile de retenție reale și cine are voie la originale:** Retenție după nomenclatorul notarial. Rolurile interne accesează documentele conform permisiunilor, iar destinatarul extern primește versiunea aleasă la crearea linkului.
3. **Pragul de încredere PII:** Auto-redactare doar pentru CNP și IBAN cu checksum valid + cuvânt-cheie în context; numele de persoane și potrivirile cu checksum invalid/incert merg în coada de revizuire umană.

## Definition of Done

* Cele 30 de documente cu date de test se procesează în mediul live. O căutare din testul de acceptanță găsește documentul în sub 2 secunde.
* Redactarea PII funcționează vizual pe minim 5 documente cu CNP / IBAN / nume, cu teste pe validatoare.
* Un fișier corupt nu blochează coada (test automat).
* Auditul e append-only și răspunde la „cine a văzut documentul X”. După casare, păstrează pe termen nelimitat istoricul accesărilor, identitatea Adminului care a confirmat casarea, numărul și data actului, tipul documentului, numărul dosarului fizic și numele părților. `admin` și `arhivar` pot consulta aceste date.
* Secretarul Notarial efectuează cinci căutări de acceptanță în mediul live. Rezultatele se documentează în `INTERVIEW.md`.

## Întrebări țintă pentru susținere

* Cum validezi un CNP și ce faci când OCR-ul a citit greșit o cifră?
* Cum garantezi că un link de partajare expirat nu mai dă acces, chiar dacă fișierul e în storage?
* Ce se întâmplă după eșecul inițial la OCR și trei reîncercări eșuate?

Cerințele confirmate sunt în [deciziile pentru fluxurile arhivei](agents/decisions/archive-workflows.md), iar aspectele rămase sunt în [întrebările deschise](agents/OPEN-QUESTIONS.md).

