/**
 * Mock Companies Data for Denmark Ecosystem Map
 * This will be replaced with real data from CVR API in Phase 2
 */

export const mockCompanies = [
    // === STARTUPS ===
    {
        id: 'startup-1',
        name: 'Pleo',
        type: 'startup',
        logo: 'https://logo.clearbit.com/pleo.io',
        coordinates: [55.6761, 12.5683], // Copenhagen
        founded: 2015,
        employees: 850,
        industry: 'FinTech',
        description: 'Pleo offers smart company cards for employees, automating expense management and giving finance teams real-time visibility into company spending.',
        isHiring: true,
        website: 'https://pleo.io'
    },
    {
        id: 'startup-2',
        name: 'Trustpilot',
        type: 'startup',
        logo: 'https://logo.clearbit.com/trustpilot.com',
        coordinates: [55.6867, 12.5701], // Copenhagen
        founded: 2007,
        employees: 900,
        industry: 'SaaS',
        description: 'Trustpilot is a leading online review platform, helping businesses build trust and transparency through verified customer reviews.',
        isHiring: true,
        website: 'https://trustpilot.com'
    },
    {
        id: 'startup-3',
        name: 'Too Good To Go',
        type: 'startup',
        logo: 'https://logo.clearbit.com/toogoodtogo.com',
        coordinates: [55.6711, 12.5534], // Copenhagen
        founded: 2015,
        employees: 1200,
        industry: 'FoodTech',
        description: 'Too Good To Go is fighting food waste by connecting users with restaurants and stores that have surplus food at great prices.',
        isHiring: true,
        website: 'https://toogoodtogo.com'
    },
    {
        id: 'startup-4',
        name: 'Lunar',
        type: 'startup',
        logo: 'https://logo.clearbit.com/lunar.app',
        coordinates: [56.1629, 10.2039], // Aarhus
        founded: 2015,
        employees: 450,
        industry: 'FinTech',
        description: 'Lunar is a Nordic digital bank offering mobile-first banking experiences for both personal and business customers.',
        isHiring: false,
        website: 'https://lunar.app'
    },
    {
        id: 'startup-5',
        name: 'Templafy',
        type: 'startup',
        logo: 'https://logo.clearbit.com/templafy.com',
        coordinates: [55.6785, 12.5912], // Copenhagen
        founded: 2014,
        employees: 350,
        industry: 'Enterprise Software',
        description: 'Templafy enables organizations to create on-brand, high-performing documents at scale with intelligent content automation.',
        isHiring: true,
        website: 'https://templafy.com'
    },
    {
        id: 'startup-6',
        name: 'Corti',
        type: 'startup',
        logo: 'https://logo.clearbit.com/corti.ai',
        coordinates: [55.6631, 12.5876], // Copenhagen
        founded: 2016,
        employees: 120,
        industry: 'HealthTech',
        description: 'Corti uses AI to assist emergency dispatchers and healthcare professionals in making faster, more accurate decisions.',
        isHiring: true,
        website: 'https://corti.ai'
    },
    {
        id: 'startup-7',
        name: 'Coinify',
        type: 'startup',
        logo: 'https://logo.clearbit.com/coinify.com',
        coordinates: [55.6590, 12.5910], // Copenhagen
        founded: 2014,
        employees: 80,
        industry: 'Blockchain',
        description: 'Coinify provides blockchain payment and trading services, enabling businesses to accept and trade cryptocurrencies.',
        isHiring: false,
        website: 'https://coinify.com'
    },
    {
        id: 'startup-8',
        name: 'Queue-it',
        type: 'startup',
        logo: 'https://logo.clearbit.com/queue-it.com',
        coordinates: [55.6528, 12.5175], // Copenhagen area
        founded: 2010,
        employees: 150,
        industry: 'SaaS',
        description: 'Queue-it provides a virtual waiting room system that protects websites from traffic overload during peak demand.',
        isHiring: true,
        website: 'https://queue-it.com'
    },
    {
        id: 'startup-9',
        name: 'Onomondo',
        type: 'startup',
        logo: 'https://logo.clearbit.com/onomondo.com',
        coordinates: [55.6823, 12.5725], // Copenhagen
        founded: 2018,
        employees: 60,
        industry: 'IoT',
        description: 'Onomondo is building the cellular network for IoT, offering global connectivity and network intelligence for connected devices.',
        isHiring: true,
        website: 'https://onomondo.com'
    },
    {
        id: 'startup-10',
        name: 'Agreena',
        type: 'startup',
        logo: 'https://logo.clearbit.com/agreena.com',
        coordinates: [55.6889, 12.5593], // Copenhagen
        founded: 2018,
        employees: 180,
        industry: 'AgriTech',
        description: 'Agreena helps farmers transition to regenerative agriculture practices and monetize their carbon sequestration.',
        isHiring: true,
        website: 'https://agreena.com'
    },

    // === INVESTORS ===
    {
        id: 'investor-1',
        name: 'Northzone',
        type: 'investor',
        logo: 'https://logo.clearbit.com/northzone.com',
        coordinates: [55.6781, 12.5559], // Copenhagen
        founded: 1996,
        employees: 35,
        industry: 'Venture Capital',
        description: 'Northzone is a leading European VC firm backing bold founders building category-defining companies.',
        isHiring: false,
        website: 'https://northzone.com'
    },
    {
        id: 'investor-2',
        name: 'Seed Capital',
        type: 'investor',
        logo: 'https://logo.clearbit.com/seedcapital.dk',
        coordinates: [55.6743, 12.5665], // Copenhagen
        founded: 2006,
        employees: 25,
        industry: 'Venture Capital',
        description: 'Seed Capital is one of the largest Nordic seed investors, focusing on early-stage tech companies with global ambitions.',
        isHiring: false,
        website: 'https://seedcapital.dk'
    },
    {
        id: 'investor-3',
        name: 'byFounders',
        type: 'investor',
        logo: 'https://logo.clearbit.com/byfounders.vc',
        coordinates: [55.6801, 12.5621], // Copenhagen
        founded: 2017,
        employees: 15,
        industry: 'Venture Capital',
        description: 'byFounders is a founder-led VC connecting Nordic startups with a network of 300+ successful tech entrepreneurs.',
        isHiring: false,
        website: 'https://byfounders.vc'
    },
    {
        id: 'investor-4',
        name: 'PreSeed Ventures',
        type: 'investor',
        logo: 'https://logo.clearbit.com/preseedventures.dk',
        coordinates: [55.6655, 12.5782], // Copenhagen
        founded: 2005,
        employees: 20,
        industry: 'Venture Capital',
        description: 'PreSeed Ventures invests in ambitious Nordic founders at the earliest stages, from pre-seed to Series A.',
        isHiring: false,
        website: 'https://preseedventures.dk'
    },
    {
        id: 'investor-5',
        name: 'EIFO (Vækstfonden)',
        type: 'investor',
        logo: 'https://logo.clearbit.com/eifo.dk',
        coordinates: [55.6698, 12.5845], // Copenhagen
        founded: 1992,
        employees: 120,
        industry: 'Public Investment',
        description: 'EIFO is Denmark\'s national promotional bank and export credit agency, supporting Danish businesses with financing and guarantees.',
        isHiring: true,
        website: 'https://eifo.dk'
    }
];

/**
 * Get companies filtered by type
 */
export function getCompaniesByType(type) {
    if (type === 'all') return mockCompanies;
    return mockCompanies.filter(company => company.type === type);
}

/**
 * Search companies by name or industry
 */
export function searchCompanies(query) {
    const lowerQuery = query.toLowerCase();
    return mockCompanies.filter(company =>
        company.name.toLowerCase().includes(lowerQuery) ||
        company.industry.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get company by ID
 */
export function getCompanyById(id) {
    return mockCompanies.find(company => company.id === id);
}

/**
 * Get counts by type
 */
export function getCounts() {
    return {
        startups: mockCompanies.filter(c => c.type === 'startup').length,
        investors: mockCompanies.filter(c => c.type === 'investor').length,
        total: mockCompanies.length
    };
}
