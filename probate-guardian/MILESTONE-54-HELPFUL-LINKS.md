# Milestone 54 — Florida circuit and county helpful-link catalog

Prepared for the Antigravity implementation pass after the circuit-selection and `.sav` plumbing is complete.

Research date: 2026-09-16

## Scope and implementation notes

- Coverage is all 20 Florida judicial circuits and all 67 counties, including Pasco.
- Keep the existing **Florida** accordion for every circuit selection.
- The current Pinellas and Sixth Judicial Circuit links are preserved below as the reference model.
- County rows intentionally favor stable official landing pages over brittle deep links. For most counties, the Clerk link is the official entry point for both probate/guardianship and court records. If the UI requires separate `Clerk — Guardianships` and `Court Records` items, it is acceptable to point both items to the same Clerk landing page until a county-specific deep link is added.
- Pasco has verified direct links for both guardianships and court-record search and should use those instead of the generic Clerk fallback.
- Guardian-association links are not added statewide. Such organizations do not exist uniformly and many are private or regional. Preserve the existing Pinellas association link only.
- Circuit-specific links are precise where a stable probate/guardianship page exists. Where one could not be located reliably, use the official circuit landing page or administrative-order index shown here rather than inventing a deep URL.

Suggested standard county descriptions:

- **Property Appraiser:** `Look up parcel ownership and assessed values`
- **Clerk — Probate & Guardianship:** `Clerk of Court probate and guardianship information`
- **Court Records:** `Search county court records`
- **Tax Collector:** `Property tax bills and payments`

Suggested standard circuit descriptions:

- **Probate & guardianship information:** `The circuit's probate and guardianship resources`
- **Probate & guardianship administrative orders:** `Local court orders and procedures`

## Circuit map and circuit-level links

| Circuit | Counties | Probate / guardianship resource | Administrative orders |
|---|---|---|---|
| 1st | Escambia, Okaloosa, Santa Rosa, Walton | [First Judicial Circuit](https://www.firstjudicialcircuit.org/) | Use the circuit site/search; no stable subject-specific index was located |
| 2nd | Franklin, Gadsden, Jefferson, Leon, Liberty, Wakulla | [Second Judicial Circuit](https://2ndcircuit.leoncountyfl.gov/) | [Administrative Orders](https://2ndcircuit.leoncountyfl.gov/adminOrders.php) |
| 3rd | Columbia, Dixie, Hamilton, Lafayette, Madison, Suwannee, Taylor | [Probate and guardianship — General Magistrate](https://thirdcircuitfl.org/general-magistrate/) | [Probate & Guardianship orders](https://thirdcircuitfl.org/orders_categories/probate-guardianship/) |
| 4th | Clay, Duval, Nassau | [Guardianship](https://www.jud4.org/self-help/guardianship) | [Administrative Orders](https://www.jud4.org/administrative-orders) |
| 5th | Citrus, Hernando, Lake, Marion, Sumter | [Fifth Judicial Circuit](https://www.circuit5.org/) | [Administrative Orders](https://www.circuit5.org/administrative-orders/) |
| 6th | Pasco, Pinellas | [Guardianship information](https://www.jud6.org/guardianship-information/) | [Probate and Guardianship Division Administrative Orders](https://www.jud6.org/LegalCommunity/LegalPractice/AOSAndRules/aos/SubjectAO/Proguard/proguard.html) |
| 7th | Flagler, Putnam, St. Johns, Volusia | [Seventh Judicial Circuit](https://circuit7.org/) | [Probate/Guardianship orders](https://circuit7.org/orders_categories/probate-guardianship/) |
| 8th | Alachua, Baker, Bradford, Gilchrist, Levy, Union | [Probate judicial practices and procedures](https://circuit8.org/general-magistrates-hearing-officers/probate-judicial-practices-and-procedures/) | [Eighth Judicial Circuit](https://circuit8.org/) |
| 9th | Orange, Osceola | [Probate Court](https://ninthcircuit.org/divisions/probate-court) | [Probate/Guardians administrative orders](https://ninthcircuit.org/administrative-orders-categories/probate-guardians) |
| 10th | Hardee, Highlands, Polk | [Guardianship Procedures in the Tenth Circuit (PDF)](https://jud10.flcourts.org/sites/default/files/adminOrders/AO_4-3.2.pdf) | [Probate & Guardianship administrative orders](https://www.jud10.flcourts.org/administrative-orders/admin-4) |
| 11th | Miami-Dade | [Probate Division](https://www.jud11.flcourts.org/About-the-Court/Court-Divisions/Probate) | The Probate Division page includes current orders and memoranda |
| 12th | DeSoto, Manatee, Sarasota | [Probate/Guardianship requirements](https://www.jud12.flcourts.org/About-the-Court/Judges-Magistrates/Judge-Charles-E-Williams) | [Administrative Orders](https://www.jud12.flcourts.org/Documents/Administrative-Orders) |
| 13th | Hillsborough | [Thirteenth Judicial Circuit](https://www.fljud13.org/) | [Probate, Guardianship, Mental Health & Trust Administrative Orders](https://www.fljud13.org/Resources/Administrative-Orders) |
| 14th | Bay, Calhoun, Gulf, Holmes, Jackson, Washington | [Fourteenth Judicial Circuit](https://jud14.flcourts.org/) | No stable subject-specific index was located; leave empty or use the circuit landing page |
| 15th | Palm Beach | [Fifteenth Judicial Circuit](https://www.15thcircuit.com/) | [Administrative Orders Search — Series 06](https://www.15thcircuit.com/ao-search) |
| 16th | Monroe | [Sixteenth Judicial Circuit](https://keyscourts.net/) | [Administrative Orders — Section 06 Probate and Guardianship](https://keyscourts.net/administrative-orders/) |
| 17th | Broward | [Probate and Guardianship](https://www.17th.flcourts.org/probate-and-guardianship/) | [Probate Administrative Orders](https://www.17th.flcourts.org/probate-administrative-orders-2/) |
| 18th | Brevard, Seminole | [Eighteenth Judicial Circuit](https://flcourts18.org/) | [Administrative Orders](https://flcourts18.org/administrative-orders/) |
| 19th | Indian River, Martin, Okeechobee, St. Lucie | [Probate & Guardianship Division](https://www.circuit19.org/probate-guardianship-division/) | [Administrative Orders](https://www.circuit19.org/administrative-orders/) |
| 20th | Charlotte, Collier, Glades, Hendry, Lee | [Twentieth Judicial Circuit](https://www.ca.cjis20.org/) | [Administrative Orders](https://www.ca.cjis20.org/Documents/admin-orders.aspx) |

## County links by circuit

Each county should appear as its own accordion. Except for Pasco and Pinellas, the Clerk link below is the stable official fallback for both probate/guardianship information and court-record access.

### 1st Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Escambia | [Property Appraiser](https://www.escpa.org/) | [Clerk](https://www.escambiaclerk.com/) | [Tax Collector](https://www.escambiataxcollector.com/) |
| Okaloosa | [Property Appraiser](https://okaloosapa.com/) | [Clerk](https://www.okaloosaclerk.com/) | [Tax Collector](https://www.okaloosatax.com/) |
| Santa Rosa | [Property Appraiser](https://srcpa.gov/) | [Clerk](https://www.santarosaclerk.com/) | [Tax Collector](https://www.srctc.com/) |
| Walton | [Property Appraiser](https://waltonpa.com/) | [Clerk](https://clerkofcourts.co.walton.fl.us/) | [Tax Collector](https://www.waltontaxcollector.com/) |

### 2nd Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Franklin | [Property Appraiser](https://franklincountypa.net/) | [Clerk](https://www.franklinclerk.com/) | [Tax Collector](https://www.franklintaxcollector.com/) |
| Gadsden | [Property Appraiser](https://gadsdenpa.com/) | [Clerk](https://www.gadsdenclerk.com/) | [Tax Collector](https://www.gadsdentaxcollector.com/) |
| Jefferson | [Property Appraiser](https://jeffersonpa.net/) | [Clerk](https://www.jeffersonclerk.com/) | [Tax Collector](https://jeffersontc.com/) |
| Leon | [Property Appraiser](https://www.leonpa.gov/) | [Clerk](https://www.clerk.leon.fl.us/) | [Tax Collector](https://www.leontaxcollector.net/) |
| Liberty | [Property Appraiser](https://libertypa.org/) | [Clerk](https://www.libertyclerk.com/) | [Tax Collector](https://www.libertytaxcollector.com/) |
| Wakulla | [Property Appraiser](https://mywakullapa.com/) | [Clerk](https://www.wakullaclerk.com/) | [Tax Collector](https://www.wakullatax.com/) |

### 3rd Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Columbia | [Property Appraiser](https://columbia.floridapa.com/) | [Clerk](https://www.columbiaclerk.com/) | [Tax Collector](https://www.columbiataxcollector.com/) |
| Dixie | [Property Appraiser](https://www.qpublic.net/fl/dixie/) | [Clerk](https://www.dixieclerk.com/) | [Tax Collector](https://dixiecountytaxcollector.com/) |
| Hamilton | [Property Appraiser](https://hamiltonpa.com/) | [Clerk](https://www.hamiltonclerk.com/) | [Tax Collector](https://www.hamiltontaxcollector.com/) |
| Lafayette | [Property Appraiser](https://www.lafayettepa.com/) | [Clerk](https://www.lafayetteclerk.com/) | [Tax Collector](https://www.lafayettetc.com/) |
| Madison | [Property Appraiser](https://madisonpa.com/) | [Clerk](https://www.madisonclerk.com/) | [Tax Collector](https://www.madisontc.com/) |
| Suwannee | [Property Appraiser](https://suwanneepa.com/) | [Clerk](https://www.suwgov.org/) | [Tax Collector](https://fl-suwannee-taxcollector.manatron.com/) |
| Taylor | [Property Appraiser](https://qpublic.net/fl/taylor/) | [Clerk](https://www.taylorclerk.com/) | [Tax Collector](https://www.taylorcountytaxcollector.com/) |

### 4th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Clay | [Property Appraiser](https://ccpao.com/) | [Clerk](https://www.clayclerk.com/) | [Tax Collector](https://www.claycountytax.com/) |
| Duval | [Property Appraiser](https://www.coj.net/departments/property-appraiser.aspx) | [Clerk](https://www.duvalclerk.com/) | [Tax Collector](https://taxcollector.jacksonville.gov/) |
| Nassau | [Property Appraiser](https://www.nassauflpa.com/) | [Clerk](https://www.nassauclerk.com/) | [Tax Collector](https://nassautaxes.com/) |

### 5th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Citrus | [Property Appraiser](https://www.citruspa.org/) | [Clerk](https://www.citrusclerk.org/) | [Tax Collector](https://www.citrustc.us/) |
| Hernando | [Property Appraiser](https://www.hernandopa-fl.us/PAWEBSITE/Default.aspx) | [Clerk](https://hernandoclerk.com/) | [Tax Collector](https://www.hernandocounty.us/tc) |
| Lake | [Property Appraiser](https://www.lakecopropappr.com/) | [Clerk](https://lakecountyclerk.org/) | [Tax Collector](https://www.laketax.com/) |
| Marion | [Property Appraiser](https://www.pa.marion.fl.us/) | [Clerk](https://www.marioncountyclerk.org/) | [Tax Collector](https://www.mariontax.com/) |
| Sumter | [Property Appraiser](https://www.sumterpa.com/) | [Clerk](https://www.sumterclerk.com/) | [Tax Collector](https://www.sumtertaxcollector.com/) |

### 6th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship | Court Records | Tax Collector | Other |
|---|---|---|---|---|---|
| Pasco | [Property Appraiser](https://pascopa.com/) | [Guardianships](https://www.pascoclerk.com/272/Guardianships) | [Search Court Records](https://pascoclerk.com/172/Search-Court-Records) | [Tax Collector](https://www.pascotaxes.com/) | — |
| Pinellas | [Property Appraiser](https://www.pcpao.gov/) | [Clerk — Guardianships](https://www.mypinellasclerk.gov/Home/Probate-Mental-Health#49273-guardianships) | [Court Records](https://courtrecords.mypinellasclerk.gov/) | [Tax Collector](https://pinellastaxcollector.gov/) | [Guardian Association of Pinellas County](https://guardianassociation.org/) |

### 7th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Flagler | [Property Appraiser](https://flaglerpa.com/) | [Clerk](https://flaglerclerk.com/) | [Tax Collector](https://www.flaglertax.com/) |
| Putnam | [Property Appraiser](https://pa.putnam-fl.com/) | [Clerk](https://putnamclerk.com/) | [Tax Collector](https://www.putnamcountytaxcollector.com/) |
| St. Johns | [Property Appraiser](https://www.sjcpa.gov/) | [Clerk](https://stjohnsclerk.com/) | [Tax Collector](https://www.sjctax.us/) |
| Volusia | [Property Appraiser](https://vcpa.vcgov.org/) | [Clerk](https://www.clerk.org/) | [Tax Collector](https://vctaxcollector.org/) |

### 8th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Alachua | [Property Appraiser](https://www.acpafl.org/) | [Clerk](https://www.alachuacounty.us/Depts/Clerk/Pages/Clerk.aspx) | [Tax Collector](https://www.alachuacollector.com/) |
| Baker | [Property Appraiser](https://www.bakerpa.com/) | [Clerk](https://bakerclerk.com/) | [Tax Collector](https://www.mybakertc.com/) |
| Bradford | [Property Appraiser](https://www.bradfordappraiser.com/) | [Clerk](https://bradfordclerk.com/) | [Tax Collector](https://www.bradfordtaxcollector.com/) |
| Gilchrist | [Property Appraiser](https://www.qpublic.net/fl/gilchrist/) | [Clerk](https://www.gilchristclerk.com/) | [Tax Collector](https://fl-gilchrist-taxcollector.publicaccessnow.com/) |
| Levy | [Property Appraiser](https://www.qpublic.net/fl/levy/) | [Clerk](https://www.levyclerk.com/) | [Tax Collector](https://levytaxcollector.com/) |
| Union | [Property Appraiser](https://union.floridapa.com/) | [Clerk](https://www.unionclerk.com/) | [Tax Collector](https://www.unioncountytaxcollector.com/) |

### 9th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Orange | [Property Appraiser](https://ocpaweb.ocpafl.org/) | [Clerk](https://myorangeclerk.com/) | [Tax Collector](https://www.octaxcol.com/) |
| Osceola | [Property Appraiser](https://www.property-appraiser.org/) | [Clerk](https://www.osceolaclerk.com/) | [Tax Collector](https://www.osceolataxcollector.org/) |

### 10th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Hardee | [Property Appraiser](https://hardeepa.com/) | [Clerk](https://www.hardeeclerk.com/) | [Tax Collector](https://www.hardeetaxcollector.com/) |
| Highlands | [Property Appraiser](https://www.hcpao.org/) | [Clerk](https://www.hcclerk.org/) | [Tax Collector](https://www.hctaxcollector.com/) |
| Polk | [Property Appraiser](https://www.polkpa.org/) | [Clerk](https://www.polkcountyclerk.net/) | [Tax Collector](https://www.polktaxes.com/) |

### 11th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Miami-Dade | [Property Appraiser](https://www.miamidade.gov/pa/) | [Clerk](https://www.miamidadeclerk.gov/) | [Tax Collector](https://www.miamidade.gov/global/taxcollector/home.page) |

### 12th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| DeSoto | [Property Appraiser](https://www.desotopa.com/) | [Clerk](https://www.desotoclerk.com/) | [Tax Collector](https://www.desototaxcollector.com/) |
| Manatee | [Property Appraiser](https://www.manateepao.gov/) | [Clerk](https://www.manateeclerk.com/) | [Tax Collector](https://www.taxcollector.com/) |
| Sarasota | [Property Appraiser](https://www.sc-pa.com/) | [Clerk](https://www.sarasotaclerk.com/) | [Tax Collector](https://www.sarasotataxcollector.gov/) |

### 13th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Hillsborough | [Property Appraiser](https://www.hcpafl.org/) | [Clerk](https://www.hillsclerk.com/) | [Tax Collector](https://www.hillstax.org/) |

### 14th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Bay | [Property Appraiser](https://baypa.net/) | [Clerk](https://www.baycoclerk.com/) | [Tax Collector](https://www.baytaxcollector.com/) |
| Calhoun | [Property Appraiser](https://calhounpa.net/) | [Clerk](https://www.calhounclerk.com/) | [Tax Collector](https://www.calhountc.com/) |
| Gulf | [Property Appraiser](https://gulfpa.com/) | [Clerk](https://www.gulfclerk.com/) | [Tax Collector](https://www.gulftaxcollector.com/) |
| Holmes | [Property Appraiser](https://www.qpublic.net/fl/holmes/) | [Clerk](https://www.holmesclerk.com/) | [Tax Collector](https://www.holmestax.com/) |
| Jackson | [Property Appraiser](https://www.qpublic.net/fl/jackson/) | [Clerk](https://www.jacksonclerk.com/) | [Tax Collector](https://www.jacksontc.com/) |
| Washington | [Property Appraiser](https://www.qpublic.net/fl/washington/) | [Clerk](https://www.washingtonclerk.com/) | [Tax Collector](https://www.washingtoncountytaxcollector.com/) |

### 15th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Palm Beach | [Property Appraiser](https://pbcpao.gov/index.htm) | [Clerk](https://www.mypalmbeachclerk.com/) | [Tax Collector](https://www.pbctax.gov/) |

### 16th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Monroe | [Property Appraiser](https://mcpafl.org/) | [Clerk](https://www.clerk-of-the-court.com/) | [Tax Collector](https://www.monroetaxcollector.com/) |

### 17th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Broward | [Property Appraiser](https://bcpa.net/) | [Clerk](https://www.browardclerk.org/) | [Tax Collector](https://browardtax.org/) |

### 18th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Brevard | [Property Appraiser](https://www.bcpao.us/) | [Clerk](https://brevardclerk.us/) | [Tax Collector](https://www.brevardtaxcollector.com/) |
| Seminole | [Property Appraiser](https://www.scpafl.org/) | [Clerk](https://www.seminoleclerk.org/) | [Tax Collector](https://seminolecounty.tax/) |

### 19th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Indian River | [Property Appraiser](https://www.ircpa.org/) | [Clerk](https://indianriverclerk.com/) | [Tax Collector](https://www.irctax.com/) |
| Martin | [Property Appraiser](https://www.pa.martin.fl.us/) | [Clerk](https://www.martinclerk.com/) | [Tax Collector](https://taxcol.martin.fl.us/) |
| Okeechobee | [Property Appraiser](https://www.okeechobeepa.com/) | [Clerk](https://myokeeclerk.com/) | [Tax Collector](https://www.okeechobeetc.com/) |
| St. Lucie | [Property Appraiser](https://www.paslc.gov/) | [Clerk](https://stlucieclerk.gov/) | [Tax Collector](https://www.tcslc.com/) |

### 20th Judicial Circuit

| County | Property Appraiser | Clerk — probate/guardianship and court records | Tax Collector |
|---|---|---|---|
| Charlotte | [Property Appraiser](https://www.ccappraiser.com/) | [Clerk](https://charlotteclerk.com/) | [Tax Collector](https://taxcollector.charlottecountyfl.gov/) |
| Collier | [Property Appraiser](https://www.collierappraiser.com/) | [Clerk](https://www.collierclerk.com/) | [Tax Collector](https://www.colliertax.com/) |
| Glades | [Property Appraiser](https://qpublic.net/fl/glades/) | [Clerk](https://gladesclerk.com/) | [Tax Collector](https://www.gladestc.com/) |
| Hendry | [Property Appraiser](https://hendryprop.com/) | [Clerk](https://www.hendryclerk.org/) | [Tax Collector](https://www.hendrycountytc.com/) |
| Lee | [Property Appraiser](https://www.leepa.org/) | [Clerk](https://www.leeclerk.org/) | [Tax Collector](https://www.leetc.com/) |

## Florida links — always displayed

These are the nine links currently wired into the live page and should remain unchanged:

| Label | Description | URL |
|---|---|---|
| Florida Courts E-Filing Portal | File documents with the court | <https://www.myflcourtaccess.com/> |
| Florida Statutes, Chapter 744 | Guardianship law (current year) | <https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0744/0744ContentsIndex.html> |
| Florida Probate Rules | The Florida Bar's court rules page | <https://www.floridabar.org/rules/ctproc/> |
| Florida Courts — Guardianship | Statewide court guardianship resources | <https://www.flcourts.gov/Services/Family-Courts/domestic-relations-court-resources/guardianship> |
| Office of Public & Professional Guardians | Department of Elder Affairs oversight of professional guardians | <https://elderaffairs.org/programs-and-services/office-of-public-professional-guardians-oppg/> |
| Florida Abuse Hotline | Report abuse, neglect or exploitation: 1-800-962-2873 | <https://www.myflfamilies.com/services/abuse/abuse-hotline> |
| Florida Treasure Hunt | Search unclaimed property that may belong to the ward | <https://www.fltreasurehunt.gov/> |
| SSA Representative Payee | Managing Social Security benefits for someone else | <https://www.ssa.gov/payee/> |
| VA Fiduciary Program | Managing VA benefits for a beneficiary | <https://www.benefits.va.gov/fiduciary/> |

## Source and verification notes

- Circuit-to-county assignments and official circuit sites: [Florida Courts — Trial Courts](https://www.flcourts.gov/Florida-Courts/Trial-Courts-Circuit)
- Property appraiser roots: [Florida Department of Agriculture / Department of Revenue parcel-service directory](https://gis.fdacs.gov/mapping/rest/services/GIO_Parcels_for_OAWP_Optimized/MapServer)
- Clerk roots: [The Florida Bar — County Clerk of Court Websites](https://www.floridabar.org/directories/courts/websites-county/)
- Tax collector roots: [Florida Tax Collectors Association — Your Tax Collector](https://floridataxcollectors.com/your-tax-collector/)
- Pasco direct guardianship and court-record links were individually verified on the Pasco Clerk site.
- The live Probate Guardian page was inspected for the existing Pinellas, Sixth Circuit, and Florida labels, descriptions, and URLs.

Because local-government sites occasionally redesign or redirect deep links, Antigravity should treat these as data, keep all external links opening in a new tab, and avoid coupling UI logic to URL path shapes.
