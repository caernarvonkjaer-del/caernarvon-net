// Helpful Resources panel for the dashboard sidebar (Milestone 47B & Milestone 54).
// Pure module: resource link directory, circuit & county scoping policy, and markup generator.

import { normalizeCountyName } from '../../core/navigation/ward-county.js';
import { FL_COUNTY_CIRCUIT, CIRCUIT_ORDINALS, circuitForCounty } from '../../core/pdf/circuit-lookup.js';

export const RESOURCE_GROUPS = Object.freeze([
  {
    id: 'pinellas',
    heading: 'Pinellas County',
    scope: 'Pinellas',
    links: [
      {
        id: 'pinellas-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.pcpao.gov/',
      },
      {
        id: 'pinellas-clerk-guardianships',
        label: 'Clerk — Guardianships',
        description: 'Clerk of Court guardianship information',
        url: 'https://www.mypinellasclerk.gov/Home/Probate-Mental-Health#49273-guardianships',
      },
      {
        id: 'pinellas-court-records',
        label: 'Court Records',
        // The Clerk moved public case-records access to courtrecords.mypinellasclerk.gov;
        // the old public.co.pinellas.fl.us/login/login_nonsubscriber.jsp link was the
        // legacy portal. Description narrowed to "court records" to match: Pinellas
        // serves OFFICIAL records (deeds, liens) from a separate host,
        // officialrecords.mypinellasclerk.gov, which this link does not reach.
        description: 'Search Pinellas County court records',
        url: 'https://courtrecords.mypinellasclerk.gov/MyCr/Cases/Search',
      },
      {
        id: 'pinellas-guardian-association',
        label: 'Guardian Association of Pinellas County',
        description: 'Education, resources, and professional guardian network',
        url: 'https://guardianassociation.org/',
      },
      {
        id: 'pinellas-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://pinellastaxcollector.gov/',
      },
    ],
  },
  {
    id: 'pasco',
    heading: 'Pasco County',
    scope: 'Pasco',
    links: [
      {
        id: 'pasco-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://pascopa.com/',
      },
      {
        id: 'pasco-clerk-guardianships',
        label: 'Clerk — Guardianships',
        description: 'Clerk of Court guardianship information',
        url: 'https://www.pascoclerk.com/272/Guardianships',
      },
      {
        id: 'pasco-court-records',
        label: 'Search Court Records',
        description: 'Search Pasco County court records',
        url: 'https://www.civitekflorida.com/ocrs/county/51/',
      },
      {
        id: 'pasco-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.pascotaxes.com/',
      },
    ],
  },
  {
    id: 'sixth-circuit',
    heading: 'Sixth Judicial Circuit',
    scope: 'circuit-6',
    links: [
      {
        id: 'sixth-circuit-guardianship',
        label: 'Guardianship information',
        description: "The circuit's guardianship page",
        url: 'https://www.jud6.org/guardianship-information/',
      },
      {
        id: 'sixth-circuit-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local orders, including AO 2024-025',
        url: 'https://www.jud6.org/LegalCommunity/LegalPractice/AOSAndRules/aos/SubjectAO/Proguard/proguard.html',
      },
    ],
  },
  {
    id: 'circuit-1',
    heading: 'First Judicial Circuit',
    scope: 'circuit-1',
    links: [
      {
        id: 'circuit-1-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.firstjudicialcircuit.org/',
      },
    ],
  },
  {
    id: 'circuit-2',
    heading: 'Second Judicial Circuit',
    scope: 'circuit-2',
    links: [
      {
        id: 'circuit-2-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://2ndcircuit.leoncountyfl.gov/',
      },
      {
        id: 'circuit-2-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://2ndcircuit.leoncountyfl.gov/adminOrders.php',
      },
    ],
  },
  {
    id: 'circuit-3',
    heading: 'Third Judicial Circuit',
    scope: 'circuit-3',
    links: [
      {
        id: 'circuit-3-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://thirdcircuitfl.org/general-magistrate/',
      },
      {
        id: 'circuit-3-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://thirdcircuitfl.org/orders_categories/probate-guardianship/',
      },
    ],
  },
  {
    id: 'circuit-4',
    heading: 'Fourth Judicial Circuit',
    scope: 'circuit-4',
    links: [
      {
        id: 'circuit-4-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.jud4.org/self-help/guardianship',
      },
      {
        id: 'circuit-4-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.jud4.org/administrative-orders',
      },
    ],
  },
  {
    id: 'circuit-5',
    heading: 'Fifth Judicial Circuit',
    scope: 'circuit-5',
    links: [
      {
        id: 'circuit-5-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.circuit5.org/',
      },
      {
        id: 'circuit-5-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.circuit5.org/administrative-orders/',
      },
    ],
  },
  {
    id: 'circuit-7',
    heading: 'Seventh Judicial Circuit',
    scope: 'circuit-7',
    links: [
      {
        id: 'circuit-7-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://circuit7.org/',
      },
      {
        id: 'circuit-7-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://circuit7.org/orders_categories/probate-guardianship/',
      },
    ],
  },
  {
    id: 'circuit-8',
    heading: 'Eighth Judicial Circuit',
    scope: 'circuit-8',
    links: [
      {
        id: 'circuit-8-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://circuit8.org/general-magistrates-hearing-officers/probate-judicial-practices-and-procedures/',
      },
      {
        id: 'circuit-8-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://circuit8.org/',
      },
    ],
  },
  {
    id: 'circuit-9',
    heading: 'Ninth Judicial Circuit',
    scope: 'circuit-9',
    links: [
      {
        id: 'circuit-9-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://ninthcircuit.org/divisions/probate-court',
      },
      {
        id: 'circuit-9-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://ninthcircuit.org/administrative-orders-categories/probate-guardians',
      },
    ],
  },
  {
    id: 'circuit-10',
    heading: 'Tenth Judicial Circuit',
    scope: 'circuit-10',
    links: [
      {
        id: 'circuit-10-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://jud10.flcourts.org/sites/default/files/adminOrders/AO_4-3.2.pdf',
      },
      {
        id: 'circuit-10-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.jud10.flcourts.org/administrative-orders/admin-4',
      },
    ],
  },
  {
    id: 'circuit-11',
    heading: 'Eleventh Judicial Circuit',
    scope: 'circuit-11',
    links: [
      {
        id: 'circuit-11-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.jud11.flcourts.org/About-the-Court/Court-Divisions/Probate',
      },
    ],
  },
  {
    id: 'circuit-12',
    heading: 'Twelfth Judicial Circuit',
    scope: 'circuit-12',
    links: [
      {
        id: 'circuit-12-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.jud12.flcourts.org/About-the-Court/Judges-Magistrates/Judge-Charles-E-Williams',
      },
      {
        id: 'circuit-12-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.jud12.flcourts.org/Documents/Administrative-Orders',
      },
    ],
  },
  {
    id: 'circuit-13',
    heading: 'Thirteenth Judicial Circuit',
    scope: 'circuit-13',
    links: [
      {
        id: 'circuit-13-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.fljud13.org/',
      },
      {
        id: 'circuit-13-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.fljud13.org/Resources/Administrative-Orders',
      },
    ],
  },
  {
    id: 'circuit-14',
    heading: 'Fourteenth Judicial Circuit',
    scope: 'circuit-14',
    links: [
      {
        id: 'circuit-14-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://jud14.flcourts.org/',
      },
    ],
  },
  {
    id: 'circuit-15',
    heading: 'Fifteenth Judicial Circuit',
    scope: 'circuit-15',
    links: [
      {
        id: 'circuit-15-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.15thcircuit.com/',
      },
      {
        id: 'circuit-15-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.15thcircuit.com/ao-search',
      },
    ],
  },
  {
    id: 'circuit-16',
    heading: 'Sixteenth Judicial Circuit',
    scope: 'circuit-16',
    links: [
      {
        id: 'circuit-16-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://keyscourts.net/',
      },
      {
        id: 'circuit-16-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://keyscourts.net/administrative-orders/',
      },
    ],
  },
  {
    id: 'circuit-17',
    heading: 'Seventeenth Judicial Circuit',
    scope: 'circuit-17',
    links: [
      {
        id: 'circuit-17-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.17th.flcourts.org/probate-and-guardianship/',
      },
      {
        id: 'circuit-17-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.17th.flcourts.org/probate-administrative-orders-2/',
      },
    ],
  },
  {
    id: 'circuit-18',
    heading: 'Eighteenth Judicial Circuit',
    scope: 'circuit-18',
    links: [
      {
        id: 'circuit-18-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://flcourts18.org/',
      },
      {
        id: 'circuit-18-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://flcourts18.org/administrative-orders/',
      },
    ],
  },
  {
    id: 'circuit-19',
    heading: 'Nineteenth Judicial Circuit',
    scope: 'circuit-19',
    links: [
      {
        id: 'circuit-19-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.circuit19.org/probate-guardianship-division/',
      },
      {
        id: 'circuit-19-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.circuit19.org/administrative-orders/',
      },
    ],
  },
  {
    id: 'circuit-20',
    heading: 'Twentieth Judicial Circuit',
    scope: 'circuit-20',
    links: [
      {
        id: 'circuit-20-guardianship',
        label: 'Probate & guardianship information',
        description: 'The circuit\'s probate and guardianship resources',
        url: 'https://www.ca.cjis20.org/',
      },
      {
        id: 'circuit-20-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local court orders and procedures',
        url: 'https://www.ca.cjis20.org/Documents/admin-orders.aspx',
      },
    ],
  },
  {
    id: 'county-alachua',
    heading: 'Alachua County',
    scope: 'Alachua',
    links: [
      {
        id: 'alachua-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.acpafl.org/',
      },
      {
        id: 'alachua-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.alachuacounty.us/Depts/Clerk/Pages/Clerk.aspx',
      },
      {
        id: 'alachua-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.alachuaclerk.org/court_records/',
      },
      {
        id: 'alachua-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.alachuacollector.com/',
      },
    ],
  },
  {
    id: 'county-baker',
    heading: 'Baker County',
    scope: 'Baker',
    links: [
      {
        id: 'baker-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.bakerpa.com/',
      },
      {
        id: 'baker-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://bakerclerk.com/',
      },
      {
        id: 'baker-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/02/',
      },
      {
        id: 'baker-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.mybakertc.com/',
      },
    ],
  },
  {
    id: 'county-bay',
    heading: 'Bay County',
    scope: 'Bay',
    links: [
      {
        id: 'bay-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://baypa.net/',
      },
      {
        id: 'bay-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.baycoclerk.com/',
      },
      {
        id: 'bay-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://court.baycoclerk.com/',
      },
      {
        id: 'bay-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.baytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-bradford',
    heading: 'Bradford County',
    scope: 'Bradford',
    links: [
      {
        id: 'bradford-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.bradfordappraiser.com/',
      },
      {
        id: 'bradford-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://bradfordclerk.com/',
      },
      {
        id: 'bradford-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/04/',
      },
      {
        id: 'bradford-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.bradfordtaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-brevard',
    heading: 'Brevard County',
    scope: 'Brevard',
    links: [
      {
        id: 'brevard-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.bcpao.us/',
      },
      {
        id: 'brevard-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://brevardclerk.us/',
      },
      {
        id: 'brevard-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://public.brevardclerk.com/BMWebLatest/Home.aspx/Search',
      },
      {
        id: 'brevard-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.brevardtaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-broward',
    heading: 'Broward County',
    scope: 'Broward',
    links: [
      {
        id: 'broward-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://bcpa.net/',
      },
      {
        id: 'broward-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.browardclerk.org/',
      },
      {
        id: 'broward-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.browardclerk.org/Web2',
      },
      {
        id: 'broward-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://browardtax.org/',
      },
    ],
  },
  {
    id: 'county-calhoun',
    heading: 'Calhoun County',
    scope: 'Calhoun',
    links: [
      {
        id: 'calhoun-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://calhounpa.net/',
      },
      {
        id: 'calhoun-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.calhounclerk.com/',
      },
      {
        id: 'calhoun-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/07/',
      },
      {
        id: 'calhoun-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.calhountc.com/',
      },
    ],
  },
  {
    id: 'county-charlotte',
    heading: 'Charlotte County',
    scope: 'Charlotte',
    links: [
      {
        id: 'charlotte-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.ccappraiser.com/',
      },
      {
        id: 'charlotte-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://charlotteclerk.com/',
      },
      {
        id: 'charlotte-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://courts.charlotteclerk.com/Benchmark/Home.aspx/Search',
      },
      {
        id: 'charlotte-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://taxcollector.charlottecountyfl.gov/',
      },
    ],
  },
  {
    id: 'county-citrus',
    heading: 'Citrus County',
    scope: 'Citrus',
    links: [
      {
        id: 'citrus-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.citruspa.org/',
      },
      {
        id: 'citrus-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.citrusclerk.org/',
      },
      {
        id: 'citrus-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://scorss.citrusclerk.org/',
      },
      {
        id: 'citrus-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.citrustc.us/',
      },
    ],
  },
  {
    id: 'county-clay',
    heading: 'Clay County',
    scope: 'Clay',
    links: [
      {
        id: 'clay-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://ccpao.com/',
      },
      {
        id: 'clay-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.clayclerk.com/',
      },
      {
        id: 'clay-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://inquiry.clayclerk.com/',
      },
      {
        id: 'clay-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.claycountytax.com/',
      },
    ],
  },
  {
    id: 'county-collier',
    heading: 'Collier County',
    scope: 'Collier',
    links: [
      {
        id: 'collier-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.collierappraiser.com/',
      },
      {
        id: 'collier-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.collierclerk.com/',
      },
      {
        id: 'collier-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://cms.collierclerk.com/cmsweb#!/',
      },
      {
        id: 'collier-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.colliertax.com/',
      },
    ],
  },
  {
    id: 'county-columbia',
    heading: 'Columbia County',
    scope: 'Columbia',
    links: [
      {
        id: 'columbia-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://columbia.floridapa.com/',
      },
      {
        id: 'columbia-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.columbiaclerk.com/',
      },
      {
        id: 'columbia-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/12/',
      },
      {
        id: 'columbia-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.columbiataxcollector.com/',
      },
    ],
  },
  {
    id: 'county-desoto',
    heading: 'DeSoto County',
    scope: 'DeSoto',
    links: [
      {
        id: 'desoto-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.desotopa.com/',
      },
      {
        id: 'desoto-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.desotoclerk.com/',
      },
      {
        id: 'desoto-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/14/',
      },
      {
        id: 'desoto-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.desototaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-dixie',
    heading: 'Dixie County',
    scope: 'Dixie',
    links: [
      {
        id: 'dixie-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/dixie/',
      },
      {
        id: 'dixie-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.dixieclerk.com/',
      },
      {
        id: 'dixie-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/15/',
      },
      {
        id: 'dixie-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://dixiecountytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-duval',
    heading: 'Duval County',
    scope: 'Duval',
    links: [
      {
        id: 'duval-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.coj.net/departments/property-appraiser.aspx',
      },
      {
        id: 'duval-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.duvalclerk.com/',
      },
      {
        id: 'duval-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://core.duvalclerk.com/',
      },
      {
        id: 'duval-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://taxcollector.jacksonville.gov/',
      },
    ],
  },
  {
    id: 'county-escambia',
    heading: 'Escambia County',
    scope: 'Escambia',
    links: [
      {
        id: 'escambia-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.escpa.org/',
      },
      {
        id: 'escambia-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.escambiaclerk.com/',
      },
      {
        id: 'escambia-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://public.escambiaclerk.com/BMWebLatest/Home.aspx/Search',
      },
      {
        id: 'escambia-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.escambiataxcollector.com/',
      },
    ],
  },
  {
    id: 'county-flagler',
    heading: 'Flagler County',
    scope: 'Flagler',
    links: [
      {
        id: 'flagler-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://flaglerpa.com/',
      },
      {
        id: 'flagler-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://flaglerclerk.com/',
      },
      {
        id: 'flagler-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://records.flaglerclerk.gov/',
      },
      {
        id: 'flagler-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.flaglertax.com/',
      },
    ],
  },
  {
    id: 'county-franklin',
    heading: 'Franklin County',
    scope: 'Franklin',
    links: [
      {
        id: 'franklin-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://franklincountypa.net/',
      },
      {
        id: 'franklin-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.franklinclerk.com/',
      },
      {
        id: 'franklin-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/19/',
      },
      {
        id: 'franklin-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.franklintaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-gadsden',
    heading: 'Gadsden County',
    scope: 'Gadsden',
    links: [
      {
        id: 'gadsden-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://gadsdenpa.com/',
      },
      {
        id: 'gadsden-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.gadsdenclerk.com/',
      },
      {
        id: 'gadsden-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.gadsdenclerk.com/CourtScribePublicInquiry/',
      },
      {
        id: 'gadsden-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.gadsdentaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-gilchrist',
    heading: 'Gilchrist County',
    scope: 'Gilchrist',
    links: [
      {
        id: 'gilchrist-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/gilchrist/',
      },
      {
        id: 'gilchrist-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.gilchristclerk.com/',
      },
      {
        id: 'gilchrist-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/21/',
      },
      {
        id: 'gilchrist-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://fl-gilchrist-taxcollector.publicaccessnow.com/',
      },
    ],
  },
  {
    id: 'county-glades',
    heading: 'Glades County',
    scope: 'Glades',
    links: [
      {
        id: 'glades-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://qpublic.net/fl/glades/',
      },
      {
        id: 'glades-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://gladesclerk.com/',
      },
      {
        id: 'glades-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/22/',
      },
      {
        id: 'glades-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.gladestc.com/',
      },
    ],
  },
  {
    id: 'county-gulf',
    heading: 'Gulf County',
    scope: 'Gulf',
    links: [
      {
        id: 'gulf-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://gulfpa.com/',
      },
      {
        id: 'gulf-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.gulfclerk.com/',
      },
      {
        id: 'gulf-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/23/',
      },
      {
        id: 'gulf-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.gulftaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-hamilton',
    heading: 'Hamilton County',
    scope: 'Hamilton',
    links: [
      {
        id: 'hamilton-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://hamiltonpa.com/',
      },
      {
        id: 'hamilton-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.hamiltonclerk.com/',
      },
      {
        id: 'hamilton-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/24/',
      },
      {
        id: 'hamilton-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hamiltontaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-hardee',
    heading: 'Hardee County',
    scope: 'Hardee',
    links: [
      {
        id: 'hardee-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://hardeepa.com/',
      },
      {
        id: 'hardee-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.hardeeclerk.com/',
      },
      {
        id: 'hardee-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/25/',
      },
      {
        id: 'hardee-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hardeetaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-hendry',
    heading: 'Hendry County',
    scope: 'Hendry',
    links: [
      {
        id: 'hendry-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://hendryprop.com/',
      },
      {
        id: 'hendry-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.hendryclerk.org/',
      },
      {
        id: 'hendry-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/26/',
      },
      {
        id: 'hendry-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hendrycountytc.com/',
      },
    ],
  },
  {
    id: 'county-hernando',
    heading: 'Hernando County',
    scope: 'Hernando',
    links: [
      {
        id: 'hernando-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.hernandopa-fl.us/PAWEBSITE/Default.aspx',
      },
      {
        id: 'hernando-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://hernandoclerk.com/',
      },
      {
        id: 'hernando-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/27/',
      },
      {
        id: 'hernando-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hernandocounty.us/tc',
      },
    ],
  },
  {
    id: 'county-highlands',
    heading: 'Highlands County',
    scope: 'Highlands',
    links: [
      {
        id: 'highlands-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.hcpao.org/',
      },
      {
        id: 'highlands-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.hcclerk.org/',
      },
      {
        id: 'highlands-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/28/',
      },
      {
        id: 'highlands-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hctaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-hillsborough',
    heading: 'Hillsborough County',
    scope: 'Hillsborough',
    links: [
      {
        id: 'hillsborough-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.hcpafl.org/',
      },
      {
        id: 'hillsborough-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.hillsclerk.com/',
      },
      {
        id: 'hillsborough-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://hover.hillsclerk.com/html/home.html',
      },
      {
        id: 'hillsborough-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.hillstax.org/',
      },
    ],
  },
  {
    id: 'county-holmes',
    heading: 'Holmes County',
    scope: 'Holmes',
    links: [
      {
        id: 'holmes-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/holmes/',
      },
      {
        id: 'holmes-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.holmesclerk.com/',
      },
      {
        id: 'holmes-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/30/',
      },
      {
        id: 'holmes-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.holmestax.com/',
      },
    ],
  },
  {
    id: 'county-indian-river',
    heading: 'Indian River County',
    scope: 'Indian River',
    links: [
      {
        id: 'indian-river-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.ircpa.org/',
      },
      {
        id: 'indian-river-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://indianriverclerk.com/',
      },
      {
        id: 'indian-river-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://indianriverclerk.com/court-records/online-case-view/',
      },
      {
        id: 'indian-river-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.irctax.com/',
      },
    ],
  },
  {
    id: 'county-jackson',
    heading: 'Jackson County',
    scope: 'Jackson',
    links: [
      {
        id: 'jackson-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/jackson/',
      },
      {
        id: 'jackson-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.jacksonclerk.com/',
      },
      {
        id: 'jackson-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/32/',
      },
      {
        id: 'jackson-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.jacksontc.com/',
      },
    ],
  },
  {
    id: 'county-jefferson',
    heading: 'Jefferson County',
    scope: 'Jefferson',
    links: [
      {
        id: 'jefferson-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://jeffersonpa.net/',
      },
      {
        id: 'jefferson-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.jeffersonclerk.com/',
      },
      {
        id: 'jefferson-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/33/',
      },
      {
        id: 'jefferson-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://jeffersontc.com/',
      },
    ],
  },
  {
    id: 'county-lafayette',
    heading: 'Lafayette County',
    scope: 'Lafayette',
    links: [
      {
        id: 'lafayette-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.lafayettepa.com/',
      },
      {
        id: 'lafayette-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.lafayetteclerk.com/',
      },
      {
        id: 'lafayette-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/34/',
      },
      {
        id: 'lafayette-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.lafayettetc.com/',
      },
    ],
  },
  {
    id: 'county-lake',
    heading: 'Lake County',
    scope: 'Lake',
    links: [
      {
        id: 'lake-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.lakecopropappr.com/',
      },
      {
        id: 'lake-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://lakecountyclerk.org/',
      },
      {
        id: 'lake-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.lakecountyclerkfl.gov/departments/courts-management/court-data-records-division/search-online-court-records/',
      },
      {
        id: 'lake-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.laketax.com/',
      },
    ],
  },
  {
    id: 'county-lee',
    heading: 'Lee County',
    scope: 'Lee',
    links: [
      {
        id: 'lee-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.leepa.org/',
      },
      {
        id: 'lee-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.leeclerk.org/',
      },
      {
        id: 'lee-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://matrix.leeclerk.org/',
      },
      {
        id: 'lee-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.leetc.com/',
      },
    ],
  },
  {
    id: 'county-leon',
    heading: 'Leon County',
    scope: 'Leon',
    links: [
      {
        id: 'leon-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.leonpa.gov/',
      },
      {
        id: 'leon-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.clerk.leon.fl.us/',
      },
      {
        id: 'leon-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://cvweb.leonclerk.com/public/online_services/search_courts_hc/search_by_name_hc.asp',
      },
      {
        id: 'leon-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.leontaxcollector.net/',
      },
    ],
  },
  {
    id: 'county-levy',
    heading: 'Levy County',
    scope: 'Levy',
    links: [
      {
        id: 'levy-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/levy/',
      },
      {
        id: 'levy-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.levyclerk.com/',
      },
      {
        id: 'levy-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/38/',
      },
      {
        id: 'levy-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://levytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-liberty',
    heading: 'Liberty County',
    scope: 'Liberty',
    links: [
      {
        id: 'liberty-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://libertypa.org/',
      },
      {
        id: 'liberty-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.libertyclerk.com/',
      },
      {
        id: 'liberty-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/39/',
      },
      {
        id: 'liberty-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.libertytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-madison',
    heading: 'Madison County',
    scope: 'Madison',
    links: [
      {
        id: 'madison-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://madisonpa.com/',
      },
      {
        id: 'madison-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.madisonclerk.com/',
      },
      {
        id: 'madison-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/40/',
      },
      {
        id: 'madison-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.madisontc.com/',
      },
    ],
  },
  {
    id: 'county-manatee',
    heading: 'Manatee County',
    scope: 'Manatee',
    links: [
      {
        id: 'manatee-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.manateepao.gov/',
      },
      {
        id: 'manatee-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.manateeclerk.com/',
      },
      {
        id: 'manatee-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://records.manateeclerk.com/CourtRecords/Search',
      },
      {
        id: 'manatee-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.taxcollector.com/',
      },
    ],
  },
  {
    id: 'county-marion',
    heading: 'Marion County',
    scope: 'Marion',
    links: [
      {
        id: 'marion-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.pa.marion.fl.us/',
      },
      {
        id: 'marion-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.marioncountyclerk.org/',
      },
      {
        id: 'marion-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/42/',
      },
      {
        id: 'marion-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.mariontax.com/',
      },
    ],
  },
  {
    id: 'county-martin',
    heading: 'Martin County',
    scope: 'Martin',
    links: [
      {
        id: 'martin-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.pa.martin.fl.us/',
      },
      {
        id: 'martin-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.martinclerk.com/',
      },
      {
        id: 'martin-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/43/',
      },
      {
        id: 'martin-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://taxcol.martin.fl.us/',
      },
    ],
  },
  {
    id: 'county-miami-dade',
    heading: 'Miami-Dade County',
    scope: 'Miami-Dade',
    links: [
      {
        id: 'miami-dade-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.miamidade.gov/pa/',
      },
      {
        id: 'miami-dade-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.miamidadeclerk.gov/',
      },
      {
        id: 'miami-dade-court-records-civil',
        label: 'Court Records — Civil, Family & Probate',
        description: 'Search civil, family, and probate court records',
        url: 'https://www2.miamidadeclerk.gov/ocs/',
      },
      {
        id: 'miami-dade-court-records-criminal',
        label: 'Court Records — Criminal',
        description: 'Search criminal court records',
        url: 'https://www2.miamidadeclerk.gov/cjis/',
      },
      {
        id: 'miami-dade-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.miamidade.gov/global/taxcollector/home.page',
      },
    ],
  },
  {
    id: 'county-monroe',
    heading: 'Monroe County',
    scope: 'Monroe',
    links: [
      {
        id: 'monroe-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://mcpafl.org/',
      },
      {
        id: 'monroe-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.clerk-of-the-court.com/',
      },
      {
        id: 'monroe-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.monroe-clerk.com/disclaimer/court-records-link',
      },
      {
        id: 'monroe-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.monroetaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-nassau',
    heading: 'Nassau County',
    scope: 'Nassau',
    links: [
      {
        id: 'nassau-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.nassauflpa.com/',
      },
      {
        id: 'nassau-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.nassauclerk.com/',
      },
      {
        id: 'nassau-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/45/',
      },
      {
        id: 'nassau-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://nassautaxes.com/',
      },
    ],
  },
  {
    id: 'county-okaloosa',
    heading: 'Okaloosa County',
    scope: 'Okaloosa',
    links: [
      {
        id: 'okaloosa-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://okaloosapa.com/',
      },
      {
        id: 'okaloosa-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.okaloosaclerk.com/',
      },
      {
        id: 'okaloosa-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://clerkapps.okaloosaclerk.com/ClerkQuest/',
      },
      {
        id: 'okaloosa-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.okaloosatax.com/',
      },
    ],
  },
  {
    id: 'county-okeechobee',
    heading: 'Okeechobee County',
    scope: 'Okeechobee',
    links: [
      {
        id: 'okeechobee-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.okeechobeepa.com/',
      },
      {
        id: 'okeechobee-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://myokeeclerk.com/',
      },
      {
        id: 'okeechobee-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/47/',
      },
      {
        id: 'okeechobee-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.okeechobeetc.com/',
      },
    ],
  },
  {
    id: 'county-orange',
    heading: 'Orange County',
    scope: 'Orange',
    links: [
      {
        id: 'orange-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://ocpaweb.ocpafl.org/',
      },
      {
        id: 'orange-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://myorangeclerk.com/',
      },
      {
        id: 'orange-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://myeclerk.myorangeclerk.com/',
      },
      {
        id: 'orange-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.octaxcol.com/',
      },
    ],
  },
  {
    id: 'county-osceola',
    heading: 'Osceola County',
    scope: 'Osceola',
    links: [
      {
        id: 'osceola-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.property-appraiser.org/',
      },
      {
        id: 'osceola-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.osceolaclerk.com/',
      },
      {
        id: 'osceola-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://courts.osceolaclerk.com/BenchmarkWeb/Home.aspx/Search',
      },
      {
        id: 'osceola-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.osceolataxcollector.org/',
      },
    ],
  },
  {
    id: 'county-palm-beach',
    heading: 'Palm Beach County',
    scope: 'Palm Beach',
    links: [
      {
        id: 'palm-beach-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://pbcpao.gov/index.htm',
      },
      {
        id: 'palm-beach-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.mypalmbeachclerk.com/',
      },
      {
        id: 'palm-beach-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://appsgp.mypalmbeachclerk.com/ecaseview',
      },
      {
        id: 'palm-beach-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.pbctax.gov/',
      },
    ],
  },
  {
    id: 'county-polk',
    heading: 'Polk County',
    scope: 'Polk',
    links: [
      {
        id: 'polk-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.polkpa.org/',
      },
      {
        id: 'polk-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.polkcountyclerk.net/',
      },
      {
        id: 'polk-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://pro.polkcountyclerk.net/PRO',
      },
      {
        id: 'polk-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.polktaxes.com/',
      },
    ],
  },
  {
    id: 'county-putnam',
    heading: 'Putnam County',
    scope: 'Putnam',
    links: [
      {
        id: 'putnam-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://pa.putnam-fl.com/',
      },
      {
        id: 'putnam-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://putnamclerk.com/',
      },
      {
        id: 'putnam-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/54/',
      },
      {
        id: 'putnam-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.putnamcountytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-santa-rosa',
    heading: 'Santa Rosa County',
    scope: 'Santa Rosa',
    links: [
      {
        id: 'santa-rosa-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://srcpa.gov/',
      },
      {
        id: 'santa-rosa-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.santarosaclerk.com/',
      },
      {
        id: 'santa-rosa-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/57/',
      },
      {
        id: 'santa-rosa-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.srctc.com/',
      },
    ],
  },
  {
    id: 'county-sarasota',
    heading: 'Sarasota County',
    scope: 'Sarasota',
    links: [
      {
        id: 'sarasota-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.sc-pa.com/',
      },
      {
        id: 'sarasota-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.sarasotaclerk.com/',
      },
      {
        id: 'sarasota-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://secure.sarasotaclerk.com/AnonLanding.aspx',
      },
      {
        id: 'sarasota-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.sarasotataxcollector.gov/',
      },
    ],
  },
  {
    id: 'county-seminole',
    heading: 'Seminole County',
    scope: 'Seminole',
    links: [
      {
        id: 'seminole-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.scpafl.org/',
      },
      {
        id: 'seminole-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.seminoleclerk.org/',
      },
      {
        id: 'seminole-court-records-civil',
        label: 'Court Records — Civil, Family & Probate',
        description: 'Search civil, family, and probate court records',
        url: 'https://courtrecords.seminoleclerk.org/civil/',
      },
      {
        id: 'seminole-court-records-criminal',
        label: 'Court Records — Criminal',
        description: 'Search criminal court records',
        url: 'https://courtrecords.seminoleclerk.org/criminal/default.aspx',
      },
      {
        id: 'seminole-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://seminolecounty.tax/',
      },
    ],
  },
  {
    id: 'county-st-johns',
    heading: 'St. Johns County',
    scope: 'St. Johns',
    links: [
      {
        id: 'st-johns-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.sjcpa.gov/',
      },
      {
        id: 'st-johns-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://stjohnsclerk.com/',
      },
      {
        id: 'st-johns-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://apps.stjohnsclerk.com/Benchmark/Home.aspx/Search',
      },
      {
        id: 'st-johns-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.sjctax.us/',
      },
    ],
  },
  {
    id: 'county-st-lucie',
    heading: 'St. Lucie County',
    scope: 'St. Lucie',
    links: [
      {
        id: 'st-lucie-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.paslc.gov/',
      },
      {
        id: 'st-lucie-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://stlucieclerk.gov/',
      },
      {
        id: 'st-lucie-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://courtcasesearch.stlucieclerk.gov/BenchmarkWebExternal/Home.aspx/Search',
      },
      {
        id: 'st-lucie-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.tcslc.com/',
      },
    ],
  },
  {
    id: 'county-sumter',
    heading: 'Sumter County',
    scope: 'Sumter',
    links: [
      {
        id: 'sumter-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.sumterpa.com/',
      },
      {
        id: 'sumter-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.sumterclerk.com/',
      },
      {
        id: 'sumter-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/60/',
      },
      {
        id: 'sumter-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.sumtertaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-suwannee',
    heading: 'Suwannee County',
    scope: 'Suwannee',
    links: [
      {
        id: 'suwannee-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://suwanneepa.com/',
      },
      {
        id: 'suwannee-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.suwgov.org/',
      },
      {
        id: 'suwannee-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/61/',
      },
      {
        id: 'suwannee-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://fl-suwannee-taxcollector.manatron.com/',
      },
    ],
  },
  {
    id: 'county-taylor',
    heading: 'Taylor County',
    scope: 'Taylor',
    links: [
      {
        id: 'taylor-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://qpublic.net/fl/taylor/',
      },
      {
        id: 'taylor-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.taylorclerk.com/',
      },
      {
        id: 'taylor-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://pubrecords.taylorclerk.com/',
      },
      {
        id: 'taylor-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.taylorcountytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-union',
    heading: 'Union County',
    scope: 'Union',
    links: [
      {
        id: 'union-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://union.floridapa.com/',
      },
      {
        id: 'union-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.unionclerk.com/',
      },
      {
        id: 'union-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/63/',
      },
      {
        id: 'union-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.unioncountytaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-volusia',
    heading: 'Volusia County',
    scope: 'Volusia',
    links: [
      {
        id: 'volusia-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://vcpa.vcgov.org/',
      },
      {
        id: 'volusia-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.clerk.org/',
      },
      {
        id: 'volusia-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://app02.clerk.org/cm_evt/inquiry.aspx',
      },
      {
        id: 'volusia-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://vctaxcollector.org/',
      },
    ],
  },
  {
    id: 'county-wakulla',
    heading: 'Wakulla County',
    scope: 'Wakulla',
    links: [
      {
        id: 'wakulla-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://mywakullapa.com/',
      },
      {
        id: 'wakulla-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.wakullaclerk.com/',
      },
      {
        id: 'wakulla-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/65/',
      },
      {
        id: 'wakulla-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.wakullatax.com/',
      },
    ],
  },
  {
    id: 'county-walton',
    heading: 'Walton County',
    scope: 'Walton',
    links: [
      {
        id: 'walton-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://waltonpa.com/',
      },
      {
        id: 'walton-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://clerkofcourts.co.walton.fl.us/',
      },
      {
        id: 'walton-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://waltonclerkfl.gov/courtrecords',
      },
      {
        id: 'walton-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.waltontaxcollector.com/',
      },
    ],
  },
  {
    id: 'county-washington',
    heading: 'Washington County',
    scope: 'Washington',
    links: [
      {
        id: 'washington-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.qpublic.net/fl/washington/',
      },
      {
        id: 'washington-clerk',
        label: 'Clerk — Probate & Guardianship',
        description: 'Clerk of Court probate and guardianship information',
        url: 'https://www.washingtonclerk.com/',
      },
      {
        id: 'washington-court-records',
        label: 'Court Records',
        description: 'Search county court records',
        url: 'https://www.civitekflorida.com/ocrs/county/67/',
      },
      {
        id: 'washington-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.washingtoncountytaxcollector.com/',
      },
    ],
  },
  {
    id: 'florida',
    heading: 'Florida',
    scope: 'statewide',
    links: [
      {
        id: 'fl-efiling-portal',
        label: 'Florida Courts E-Filing Portal',
        description: 'File documents with the court',
        url: 'https://www.myflcourtaccess.com/',
      },
      {
        id: 'fl-statutes-744',
        label: 'Florida Statutes, Chapter 744',
        description: 'Guardianship law (current year)',
        url: 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0744/0744ContentsIndex.html',
      },
      {
        id: 'fl-probate-rules',
        label: 'Florida Probate Rules',
        description: "The Florida Bar's court rules page",
        url: 'https://www.floridabar.org/rules/ctproc/',
      },
      {
        id: 'fl-courts-guardianship',
        label: 'Florida Courts — Guardianship',
        description: 'Statewide court guardianship resources',
        url: 'https://www.flcourts.gov/Services/Family-Courts/domestic-relations-court-resources/guardianship',
      },
      {
        id: 'fl-oppg',
        label: 'Office of Public & Professional Guardians',
        description: 'Department of Elder Affairs oversight of professional guardians',
        url: 'https://elderaffairs.org/programs-and-services/office-of-public-professional-guardians-oppg/',
      },
      {
        id: 'fl-abuse-hotline',
        label: 'Florida Abuse Hotline',
        description: 'Report abuse, neglect or exploitation: 1-800-962-2873',
        url: 'https://www.myflfamilies.com/services/abuse/abuse-hotline',
      },
      {
        id: 'fl-treasure-hunt',
        label: 'Florida Treasure Hunt',
        description: 'Search unclaimed property that may belong to the ward',
        url: 'https://www.fltreasurehunt.gov/',
      },
      {
        id: 'us-ssa-payee',
        label: 'SSA Representative Payee',
        description: 'Managing Social Security benefits for someone else',
        url: 'https://www.ssa.gov/payee/',
      },
      {
        id: 'us-va-fiduciary',
        label: 'VA Fiduciary Program',
        description: 'Managing VA benefits for a beneficiary',
        url: 'https://www.benefits.va.gov/fiduciary/',
      },
    ],
  },
].map(group => Object.freeze({
  ...group,
  links: Object.freeze(group.links.map(link => Object.freeze({ ...link }))),
})));

/**
 * Resolve county names belonging to a Florida Judicial Circuit (1 through 20).
 * @param {number|string} circuitNum
 * @returns {string[]} Alphabetical array of county names
 */
export function countiesForCircuit(circuitNum) {
  const cNum = Number(circuitNum) || 6;
  const validNum = cNum >= 1 && cNum <= 20 ? cNum : 6;
  return Object.keys(FL_COUNTY_CIRCUIT)
    .filter(county => FL_COUNTY_CIRCUIT[county] === validNum)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Build resource groups for a given Judicial Circuit (Milestone 54):
 * - One group per county in the selected circuit.
 * - Included circuit-level group if present (e.g. Sixth Judicial Circuit).
 * - "Florida" statewide group always included at the bottom.
 * @param {number|string} [circuitNum=6]
 * @returns {Array}
 */
export function groupsForCircuit(circuitNum = 6) {
  const cNum = Number(circuitNum) || 6;
  const counties = countiesForCircuit(cNum);
  const result = [];

  for (const county of counties) {
    const existingGroup = RESOURCE_GROUPS.find(g => g.scope === county);
    if (existingGroup) {
      result.push(existingGroup);
    } else {
      result.push({
        id: `county-${county.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        heading: `${county} County`,
        scope: county,
        links: [],
      });
    }
  }

  // Circuit-level group (e.g. "Sixth Judicial Circuit"), if RESOURCE_GROUPS
  // has one for this circuit -- keyed by `scope`, not hardcoded to circuit 6,
  // so a future circuit-level group (Milestone 54's helpful-links wiring
  // task) is picked up automatically rather than needing this function
  // edited per circuit. This is also the AO 2024-025 link's gate (Milestone
  // 36-5/47B): it renders only inside the Sixth Circuit's own group, which
  // itself renders only when circuit 6 is the one selected -- a different
  // mechanism than 47B's filing-county gate, but the same guarantee AGENTS.md
  // section 5 requires: never shown unconditionally, only when the SELECTED
  // circuit is 6, and always inside this panel's own third-party disclaimer.
  // See tests/unit/content-corrections.spec.js's "AO 2024-025 removal guard".
  const circuitGroup = RESOURCE_GROUPS.find(g => g.scope === `circuit-${cNum}`);
  if (circuitGroup && !result.includes(circuitGroup)) {
    result.push(circuitGroup);
  }

  // Always append Florida statewide group at the end
  const floridaGroup = RESOURCE_GROUPS.find(g => g.id === 'florida');
  if (floridaGroup && !result.includes(floridaGroup)) {
    result.push(floridaGroup);
  }

  return result;
}

/**
 * Milestone 54, Decision D4's successor: the circuit selector's DEFAULT,
 * not a filter. Derived from the counties that actually appear on the
 * user's filings -- the most common circuit among them wins a tie broken by
 * circuit number, so one outlier filing doesn't flip the default back and
 * forth. Returns null when no filing has a resolvable county, so the caller
 * can fall back to the neutral default (6) instead of guessing.
 *
 * Superseded here (Milestone 47B's `groupsForCounties`, which filtered
 * RESOURCE_GROUPS directly to Pinellas/Pasco/Sixth-Circuit-only): this app
 * now shows every county's accordion for whichever circuit is selected
 * (`groupsForCircuit`), so "which groups to show" is no longer county-list
 * dependent -- only "which circuit is selected by default" still is, which
 * is what this function answers. This is a *default*, not a filter: a
 * manual selection always overrides it (see dashboard/index.js), and this
 * function's result is never written back to caseFile.selectedCircuit.
 * @param {string[]} [counties]
 * @returns {number|null}
 */
export function deriveDefaultCircuit(counties = []) {
  const rawList = Array.isArray(counties) ? counties : [];
  const normalized = rawList.map(c => normalizeCountyName(c)).filter(Boolean);
  const tally = new Map();
  for (const county of normalized) {
    const circuit = circuitForCounty(county);
    if (!circuit) continue;
    tally.set(circuit, (tally.get(circuit) || 0) + 1);
  }
  if (tally.size === 0) return null;
  let best = null;
  for (const [circuit, count] of tally) {
    if (!best || count > best.count || (count === best.count && circuit < best.circuit)) {
      best = { circuit, count };
    }
  }
  return best.circuit;
}

function defaultEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultIc(name, size) {
  if (typeof window !== 'undefined' && typeof window.ic === 'function') {
    return window.ic(name, size);
  }
  return '';
}

/**
 * Render the Helpful Resources panel markup with Judicial Circuit selector (Milestone 54).
 *
 * `groups` left `undefined` derives the panel's groups from `selectedCircuit`
 * via `groupsForCircuit()`; an explicit array (including `[]`) is rendered
 * as given, and an empty result renders nothing -- a caller passing no
 * groups on purpose gets an empty panel, not a silent circuit-6 fallback.
 * @param {Array} [groups]
 * @param {{ selectedCircuit?: number, esc?: (s: string) => string, ic?: (name: string, size?: number) => string }} [options]
 * @returns {string}
 */
export function resourcesPanelHTML(groups, { selectedCircuit = 6, esc = defaultEsc, ic = defaultIc } = {}) {
  const activeCircuit = selectedCircuit >= 1 && selectedCircuit <= 20 ? Number(selectedCircuit) : 6;
  const displayGroups = groups === undefined ? groupsForCircuit(activeCircuit) : (Array.isArray(groups) ? groups : []);

  if (!displayGroups || displayGroups.length === 0) return '';

  const circuitOptionsHTML = Array.from({ length: 20 }, (_, idx) => {
    const num = idx + 1;
    const ordinal = CIRCUIT_ORDINALS[num] || String(num);
    const selected = num === activeCircuit ? ' selected' : '';
    return `<option value="${num}"${selected}>${esc(ordinal)} Judicial Circuit</option>`;
  }).join('');

  const groupsHTML = displayGroups.map(group => `
    <details class="sidebar-resource-group">
      <summary class="nav-section-label sidebar-resource-summary">${esc(group.heading)}</summary>
      ${group.links && group.links.length > 0 ? group.links.map(link => `
        <div class="sidebar-resource-item">
          <a class="sidebar-resource-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ${ic('external', 12)}<span class="visually-hidden"> (opens in a new tab)</span></a>
          <div class="sidebar-resource-desc">${esc(link.description)}</div>
        </div>
      `).join('') : '<div class="sidebar-resource-empty">No county-specific links yet — see Florida below.</div>'}
    </details>
  `).join('');

  return `<section class="sidebar-resources-panel" aria-labelledby="sidebar-resources-title">
    <h2 class="sidebar-resources-title visually-hidden" id="sidebar-resources-title">Helpful Resources</h2>
    <div class="sidebar-circuit-selector-wrap">
      <label for="sidebar-circuit-select" class="nav-section-label sidebar-circuit-label">Judicial Circuit</label>
      <select id="sidebar-circuit-select" class="form-select form-select-sm sidebar-circuit-select" data-action="change-circuit">
        ${circuitOptionsHTML}
      </select>
    </div>
    ${groupsHTML}
    <div class="sidebar-resource-disclaimer">
      These are independent government and third-party sites. Probate Guardian isn't affiliated with them and doesn't control their content.
    </div>
  </section>`;
}
