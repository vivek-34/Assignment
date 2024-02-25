const puppeteer = require('puppeteer');
const fs = require('fs');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);

async function scrapeLinkedInCompany(companyName) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        // Navigate to LinkedIn and search for the company
        await page.goto('https://www.linkedin.com/', { waitUntil: 'networkidle2' });
        await page.type('input[name="q"]', companyName);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Click on the first search result assuming it's the company's page
        await page.click('.search-result__result-link');

        // Wait for the company page to load
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Extract company details and key personnel information
        const companyDetails = await page.evaluate(() => {
            const nameElement = document.querySelector('.org-top-card-summary__title');
            const websiteElement = document.querySelector('.org-about-company-module__company-page-url a');

            // Check if the elements exist before accessing their properties
            const name = nameElement ? nameElement.innerText.trim() : 'N/A';
            const website = websiteElement ? websiteElement.innerText.trim() : 'N/A';
            const linkedinUrl = window.location.href;

            const keyPersonnel = Array.from(document.querySelectorAll('.org-people-profile-card')).map(person => {
                const personName = person.querySelector('.org-people-profile-card__profile-title').innerText.trim();
                const position = person.querySelector('.lt-line-clamp__line').innerText.trim();
                const email = person.querySelector('.org-people-profile-card__right-column .pv-contact-info__contact-link').innerText.trim();
                const phone = person.querySelector('.org-people-profile-card__right-column .t-14').innerText.trim();

                return { personName, position, email, phone };
            });

            return { name, website, linkedinUrl, keyPersonnel };
        });

        return companyDetails;
    } finally {
        await browser.close();
    }
}

async function main() {
    const companies = ['google', 'microsoft', 'amazon']; // Add your list of companies

    const data = [];

    for (const company of companies) {
        const companyDetails = await scrapeLinkedInCompany(company);
        data.push(companyDetails);
    }

    // Convert data to CSV format and write to a file
    const csvData = data.map((company) => {
        const keyPersonnelData = company.keyPersonnel.map(person => `${person.personName} (${person.position}): ${person.email}, ${person.phone}`).join(';');
        return `${company.name},${company.website},${company.linkedinUrl},${keyPersonnelData}`;
    }).join('\n');

    await writeFileAsync('output.csv', csvData, 'utf-8');
    console.log('Scraping completed. Check output.csv for the results.');
}

main();
