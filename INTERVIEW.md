# Interviu — Arhivă Notarială (Cabinet Individual Notarial)

> Document livrabil conform cerințelor de proiect (`docs/brief.md`).
> Acest document conține interviul cu persoana responsabilă de arhiva notarială (Notar Public / Arhivar), stabilind cerințele operaționale, fluxul de căutare, politicile de confidențialitate (PII) și termenele de retenție conform Nomenclatorului Arhivistic Notarial.

---

## 1. Date Generale Interviu

- **Organizație:** Cabinet Individual Notarial
- **Persoană intervievată:** [Nume / Funcție — Notar Public / Arhivar / Secretar notarial]
- **Data interviului:** [Data realizării interviului]
- **Locație / Format:** [Sediul cabinetului / Telefonic / Online]
- **Intervievator:** [Nume student / dezvoltator]

---

## 2. Contextul Arhivei Fizice Curente

### Cum este organizată arhiva în prezent?
- *Tipuri de documente gestionate:* (ex. contracte de vânzare-cumpărare, procuri, declarații, certificate de moștenitor, încheieri de autentificare, registre notariale)
- *Volum estimat:* (număr de dosare / bibliorafturi / acte pe an)
- *Starea fizică a documentelor:* (documente dactilografiate, tipărite modern, adnotate olograf / scrise de mână)

### Cum se caută un document în prezent?
- *Procedura de căutare:* (ex. căutare după număr de încheiere și an în opis/registru pe hârtie sau Excel, apoi identificare fizică la raft)
- *Timp mediu de căutare:* (cât durează găsirea unui act specific, ex. „contractul din 2019”)
- *Dificultăți întâmpinate:* (documente rătăcite, deteriorare hârtie, lipsă căutare după text/conținut sau părți semnatare)

---

## 3. Acces, Roluri și Permisiuni

### Cine are acces la arhivă și ce nivel de acces are fiecare?
- **Admin / Notar:** Acces complet la toate documentele, originale, metadate și rapoarte de audit.
- **Arhivar / Personal secretariat:** Acces la scanări originale pentru verificare, indexare, corectare OCR și aprobare redactare PII.
- **Cititor / Părți externe / Consultare:** Acces exclusiv la versiunile anonimizate/redactate vizual (fără acces la CNP, conturi bancare sau date de identificare ale terților).

### Politici de partajare externă
- Cum se eliberează duplicate sau extrase către părți sau instituții?
- Necesitatea link-urilor securizate cu expirare temporară.

---

## 4. Date cu Caracter Personal (PII) și Protecția Datelor

### Ce date cu caracter personal apar în actele notariale?
- CNP (Cod Numeric Personal)
- Serie și număr act de identitate (CI / Pașaport)
- Adrese de domiciliu / reședință
- Numere de cont bancar (IBAN)
- Numere de telefon și adrese de email
- Numele și prenumele părților semnatare

### Reguli specifice pentru Notariat
- **Numele Notarului Public și al cabinetului:** Sunt publice și apar în antet/încheiere — NU se redactează.
- **Părțile semnatare (Signatory Parties):** Datele lor de identificare trebuie protejate la consultare publică/cititori.
- **Validare și prag de încredere:**
  - CNP-urile și IBAN-urile cu cifră de control validă + context notarial (`CNP:`, `subsemnatul`) sunt redactate automat.
  - Numele de persoane și detecțiile incerte/corupte la OCR necesită revizuire umană de către arhivar.
- **Redactare vizuală:** Aplicarea de dreptunghiuri negre arse direct în imagine/PDF, astfel încât datele să nu poată fi recuperate din stratul grafic sau text.

---

## 5. Politici de Retenție și Nomenclator Arhivistic

### Cât timp se păstrează documentele?
- *Acte cu păstrare permanentă / istorică:* (ex. acte de proprietate, certificate de moștenitor, registre de autentificări)
- *Acte cu termen limitat:* (ex. procuri speciale, declarații simple, corespondență administrativă — 5 ani / 10 ani)
- *Calculul termenului de retenție:* Se calculează de la **Data Actului** (data autentificării), NU de la data scanării/încărcării în sistem.
- *Procedura la expirarea termenului:* Propunere de casare/eliminare cu confirmare manuală obligatorie din partea notarului/arhivarului.

---

## 6. Verificare și Căutare în Aplicație (Cerință Definition of Done)

> Notă: Această secțiune va fi completată după încărcarea corpusului de 30 de documente reale și testarea căutării full-text de către persoana din cabinet.

| # | Document căutat | Criterii căutare (cuvinte-cheie / filtre) | Timp răspuns (< 2s) | Rezultat găsit corect (Da/Nu) | Observații arhivar |
|---|-----------------|-------------------------------------------|---------------------|-------------------------------|--------------------|
| 1 |                 |                                           |                     |                               |                    |
| 2 |                 |                                           |                     |                               |                    |
| 3 |                 |                                           |                     |                               |                    |
| 4 |                 |                                           |                     |                               |                    |
| 5 |                 |                                           |                     |                               |                    |

---

## 7. Transcrierea Brută a Discuției / Notițe Complete

*(Lipiți mai jos textul complet al discuției, răspunsurile detaliate sau notițele luate în timpul interviului)*

```text
[Lipiți aici textul interviului...]
```
