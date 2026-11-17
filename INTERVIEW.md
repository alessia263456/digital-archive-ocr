# Interviu — Arhivă Notarială (Cabinet Individual Notarial)

> Document livrabil conform cerințelor de proiect (`docs/brief.md`).
> Acest document conține interviul cu persoana responsabilă de arhiva notarială (Notar Public / Arhivar), stabilind cerințele operaționale, fluxul de căutare, politicile de confidențialitate (PII) și termenele de retenție conform Nomenclatorului Arhivistic Notarial.

---

## 1. Date Generale Interviu

**Organizație:** Birou Individual Notarial
**Persoana intervievată:** Secretar Notarial  
**Data interviului:** 14 Noiembrie 2026 

---
## 2. Notițe Complete Interviu

### „Cum găsiți în prezent un document vechi (ex. un contract sau o procură din 2019) și cât timp durează căutarea?”
**Răspuns:** În fiecare zi se completează de mână un registru care conține numele persoanelor implicate în act, tipul actului, numărul de dosar, indicatorul arhivistic, nr. act și nr. inventar. La finalul zilei se completează un opis alfabetic (după inițiala numelui), pe anul în curs.
Un document vechi se găsește astfel: dacă se cunoaște anul în care a fost emis, se consultă opisul alfabetic din acel an, căutându-se numele persoanei care este prezentă în act. Dacă nu se cunoaște anul, ci doar perioada aproximativă în care a fost emis, se vor consulta toate opisurile din acea perioadă. Astfel se găsește numărul de dosar, unde se va găsi documentul în arhivă.
Căutarea poate dura foarte mult. În general, pentru o programare la notariat, de exemplu pentru o succesiune, actele necesare se caută în arhivă cu câteva zile înainte de programare.

### „Cum este în prezent organizată arhiva? (pe ani, în funcție de nume?)”
**Răspuns:** Arhiva este organizată pe dosare, după tipul documentului (deci indicativul arhivistic) și timpul de păstrare. De exemplu, pentru procuri și declarații cu indicativ arhivistic IA1, există dosarul nr. 29/2014. Pe cotorul dosarului este scris numărul dosarului, indicatorul arhivistic, nr. act (ex. 761-1020), data (ex. 12.06.2014-14.08.2014), nr. inventar (ex. 29/2014), T.P. (timp păstrare) și eventual tipul documentelor scris explicit (ex. procuri și declarații).

### „Cine din cabinet are voie să vadă documentele originale cu toate datele cu caracter personal la vedere (CNP, adrese, IBAN)?”
**Răspuns:** Documentele originale sunt vizualizate de notar și arhivar. Documentele se eliberează doar titularului în persoană, pe bază de buletin. Documentele au valoare legală doar dacă sunt fizice, cele digitale nu au valoare juridică.

### „Aveți situații în care trebuie să eliberați copii sau extrase anonimizate/redactate către terți (ex. avocați, instanțe, alți clienți)?”
**Răspuns:** Singurele situații în care se pot elibera copii anonimizate este pentru a oferi un model de act (de exemplu un client are nevoie de o procură specială, dar pe care o va întocmi la alt cabinet notarial. Se poate elibera o copie anonimizată cu un model de formulare).

### „Cum procedați când trimiteți un document pe email sau prin link rapid? Folosiți parole sau limite de timp pentru descărcare?”
**Răspuns:** Documentele se trimit pe email doar după ce titularul se prezintă în persoană la cabinet, se identifică prin carte de identitate și completează o cerere de trimitere pe email/fax. O copie se poate trimite scanat, dar nu va avea nicio valoare juridică, ci poate fi privit doar informativ. De exemplu pentru a consulta o moștenire, dar actul nu poate fi folosit propriu-zis.

### „Cât de frecvent aveți de-a face cu acte vechi completate sau adnotate de mână (ex. cereri, mențiuni pe margine)?”
**Răspuns:** Zilnic se completează cereri de mână.

### „Care sunt termenele legale de păstrare pentru diferitele tipuri de acte notariale (ex. procuri vs. acte de proprietate vs. cereri simple)?”
**Răspuns:** Timpul de păstrare al documentelor este documentat în nomenclatorul arhivistic. Notarul trebuie să dea aprobarea finală pentru distrugerea documentelor după expirarea lor.

**Notă**
În urma interviului, am primit din partea biroului notarial **Nomenclatorul Arhivistic** oficial (aprobat prin Hotărârea Consiliului UNNPR nr. 117 din 19.11.2014), în format PDF scanat, pe baza căruia am extras și structurat regulile de arhivare pentru aplicație. (vezi `docs/nomenclator_arhivistic.csv`)
Pentru a elimina ambiguitățile în aplicație, am separat documentele în funcție de obiectul juridic și locul arhivării (de ex. *procură* de vânzare `IA 1 – P` vs. *procură* radiere auto `IA 21 – 5 ani C.S.`; iar la *succesiuni*, am separat explicit *testamentul/declarația succesorală* `IA 3 – P` și *certificatul de moștenitor/încheierea finală* `IA 6 – P` de *dosarul succesoral* cu acte procedurale `IA 17 – 10 ani C.S.`).
Am inclus explicit momentul de la care începe să curgă termenul de păstrare (de la 1 ianuarie al anului următor încheierii actului, de la soluționarea dosarului, de la expirarea contractului — ex. comodat/închiriere `IA 20` — sau de la eliberarea depozitului `IA 24`), pentru calculul datei scadente a documentelor.

### „Cum decideți ce documente trebuie distruse când le expiră termenul și cine dă aprobarea finală?”
**Răspuns:** Deoarece dosarele sunt grupate în funcție de timpul de păstrare, este ușor de identificat ce documente trebuie distruse. Notarul public este cel care dă aprobarea finală. În cazul în care termenele au și mențiunea CS (Comisia de Selecționare - ex. 5 ani CS) în urma unei analize amănunțite, comisia (formată la nivelul cabinetului din notar, arhivar și secretar) poate propune prelungirea termenelor de păstrare sau casarea lor.

### „Este necesar să știți exact cine din echipa cabinetului a vizualizat, a descărcat sau a modificat un anumit fișier și la ce dată?”
**Răspuns:** Da, mai ales atunci când cineva accesează varianta neredactată a unui act sau îl distribuie către exterior (doar pe bază de cerere scrisă întocmită la cabinet).

### Ce date cu caracter personal apar în actele notariale?
- CNP (Cod Numeric Personal)
- Serie și număr act de identitate (CI / Pașaport)
- Adrese de domiciliu / reședință
- Numere de cont bancar (IBAN)
- Numere de telefon și adrese de email
- Numele și prenumele părților semnatare
- Detalii despre proprietăți (vecinătăți, adrese, documentație cadastrală)
- Date de identificare ale bunurilor mobile(număr înmatriculare și serie de șasiu la autoturisme) 
- Date de identificare ale firmelor (CUI/CIF)
- Semnături olografe
- Număr de carte funciară
- Număr cadastral

## Alte mențiuni 

Pentru că un document este valid doar în forma lui fizică, tipărită, ștampilată, este necesar ca în aplicație să fie vizibil **numărul dosarului** unde se găsește actul în arhiva de la cabinet. Aceasta ar trebui să fie funcția principală a aplicației, pentru a eficientiza căutarea în arhivă.


---

## 3. Verificare și Căutare în Aplicație (Cerință Definition of Done)

> Notă: Această secțiune va fi completată după încărcarea corpusului de 30 de documente reale și testarea căutării full-text de către persoana din cabinet.

| # | Document căutat | Criterii căutare (cuvinte-cheie / filtre) | Timp răspuns (< 2s) | Rezultat găsit corect (Da/Nu) | Observații arhivar |
|---|-----------------|-------------------------------------------|---------------------|-------------------------------|--------------------|
| 1 |                 |                                           |                     |                               |                    |
| 2 |                 |                                           |                     |                               |                    |
| 3 |                 |                                           |                     |                               |                    |
| 4 |                 |                                           |                     |                               |                    |
| 5 |                 |                                           |                     |                               |                    |

---

