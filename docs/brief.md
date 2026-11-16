# Project Specifications — digital-archive-ocr

# P22 — Arhivă digitală cu OCR și redactare PII

* **Categorie:** E. Integrări \& fișiere
* **Dificultate:** ★★★★ (\~38h)
* **Runda:** 1 (1 student)

## Pe scurt

Sistem de gestiune a documentelor pentru o organizație reală cu hârtii (asociație, parohie, secretariat, cabinet, mică firmă): upload în masă, OCR în română, căutare full-text, detecția și redactarea datelor personale, versiuni, permisiuni pe foldere și retenție.

## Input uman obligatoriu

O organizație reală cu arhivă pe hârtie. Scanezi / fotografiezi minim 30 de documente reale (cu acordul organizației, anonimizate unde e cazul: tipuri diferite, calitate diferită, scris de mână inclusiv). Interviu cu persoana care ține arhiva: cum caută un document azi, cine are voie să vadă ce, cât timp trebuie păstrate, ce se întâmplă cu CNP-urile din ele.

* Livrabile dovadă: `INTERVIEW.md` + `CORPUS.md` (descrierea celor 30 de documente).

## Context real

Dosarele sunt în dulap. Când cineva cere „contractul cu firma X din 2019”, durează o oră. Documentele conțin CNP-uri, telefoane și IBAN-uri care nu ar trebui să fie vizibile oricui. Nimeni nu știe ce trebuie distrus după 5 ani.

## Cerințe funcționale (must)

* **Upload în masă \& status asincron:** drag \& drop pentru PDF / JPG / PNG / DOCX, cu procesare asincronă și status vizibil per document (`în coadă` → `OCR` → `indexat` → `eroare`).
* **OCR în română:** Tesseract (sau similar) cu text extras păstrat alături de original + posibilitate de corecție manuală a textului.
* **Căutare full-text:** evidențiere în rezultate, filtre (folder, tip, dată, etichete), sortare după relevanță.
* **Extragere de metadate:** date calendaristice, sume, numere de document, cu sugestii de etichetare.
* **Detecție și redactare PII:** detectare CNP, telefon, IBAN, email și nume de persoane cu validare (CNP cu cifră de control, IBAN cu checksum) și redactare în versiunea vizibilă a documentului, după un pas de revizuire umană.
* **Permisiuni \& partajare:** foldere cu permisiuni (`citire` / `scriere` / `fără acces`) pe roluri și pe utilizatori; link-uri de partajare cu expirare și parolă opțională.
* **Versiuni \& audit:** re-upload al aceluiași document (versionare) și jurnal de audit complet (cine a văzut, descărcat, modificat, când).
* **Politici de retenție:** reguli per folder (păstrare N ani) cu listă de documente „de distrus” și confirmare manuală.
* **Roluri sistem:** `cititor`, `arhivar`, `admin`.

## Cerințe tehnice specifice P22

* **Pipeline asincron:** coadă și worker separat, retry cu backoff, documente „otrăvite” izolate după N eșecuri (test obligatoriu cu un fișier corupt).
* **Object storage privat:** fișiere stocate în object storage și servite exclusiv prin URL-uri semnate cu expirare; niciodată URL-uri publice permanente.
* **Full-text search:** PostgreSQL `tsvector` (dicționar românesc); test de relevanță pe corpusul real.
* **Deduplicare:** hash exact al fişierului + similaritate a textului (near-duplicate) semnalată la upload.

## Twist: redactarea care nu scapă nimic și auditul care nu minte

* Detecția PII pe text OCR-uit e imperfectă (ex. un CNP citit cu `1` în loc de `I`): regulile trebuie să combine pattern-uri, validare de checksum și context (`"CNP:"` în apropiere), să marcheze incertitudinile pentru revizuire și să producă o versiune **redactată vizual** (pixeli acoperiți în imagine / PDF, nu doar text șters).
* Originalul rămâne accesibil doar rolurilor permise.
* Auditul trebuie să fie **append-only** (nici adminul nu poate șterge intrări) și să demonstreze, la o cerere GDPR, toate accesele la un document.
* Retenția se calculează din **data documentului** (extrasă sau introdusă), nu din data upload-ului.

## Variabilele proiectului

1. **Organizația și cele 30 de documente:** Cabinet Individual Notarial 
2. **Regulile de retenție reale și cine are voie la originale:** Retenție pe categorii conform nomenclatorului notarial; acces la originale doar pentru `admin` și `arhivar` (`cititor` și link-urile externe văd doar varianta redactată).
3. **Pragul de încredere PII:** Auto-redactare doar pentru CNP și IBAN cu checksum valid + cuvânt-cheie în context; numele de persoane și potrivirile cu checksum invalid/incert merg în coada de revizuire umană.

## Definition of Done

* Cele 30 de documente sunt procesate pe live; o căutare reală a arhivarului găsește documentul în sub 2 secunde.
* Redactarea PII funcționează vizual pe minim 5 documente cu CNP / IBAN / nume, cu teste pe validatoare.
* Un fișier corupt nu blochează coada (test automat).
* Auditul e append-only și răspunde la „cine a văzut documentul X”.
* Arhivarul a căutat 5 documente în aplicație; rezultatul e documentat în `INTERVIEW.md`.

## Întrebări țintă pentru susținere

* Cum validezi un CNP și ce faci când OCR-ul a citit greșit o cifră?
* Cum garantezi că un link de partajare expirat nu mai dă acces, chiar dacă fișierul e în storage?
* Ce se întâmplă cu un document care pică la OCR de 3 ori?

