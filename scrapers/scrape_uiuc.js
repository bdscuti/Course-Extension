const fs = require('fs/promises');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const manual = false;

// 1. Setup Arguments (Year and Semester)
// manual entry
const args = process.argv.slice(2);
const year = args[0] || '2026';
const semester = args[1] || 'spring';

// auto entry
const semesters = ['spring', 'summer', 'fall', 'winter'];
const start = 2016;
const end = 2026;



const years = [];
for (let i = start; i <= end; i++) {
    years.push(i);
}

const BASE_URL = "https://courses.illinois.edu/cisapp/explorer/schedule";

// 2. Configure XML Parser to strip namespaces (ns2:) for easier handling
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true 
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchXML(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        return parser.parse(text);
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    
    }
}




// Add 'masterData' as a parameter
async function scrape(year, semester, masterData) {
    console.log(`Scraping ${semester} ${year}...`);

    const semesterUrl = `${BASE_URL}/${year}/${semester}.xml`;
    const rootData = await fetchXML(semesterUrl);

    if (!rootData || !rootData.term || !rootData.term.subjects) return;

    let subjects = rootData.term.subjects.subject;
    if (!Array.isArray(subjects)) subjects = [subjects];

    for (const sub of subjects) {
        const subjectId = sub["@_id"];
        const subjectHref = sub["@_href"];
        const subjectData = await fetchXML(subjectHref);
        
        if (subjectData && subjectData.subject && subjectData.subject.courses) {
            let courses = subjectData.subject.courses.course;
            if (!Array.isArray(courses)) courses = [courses];

            courses.forEach(course => {
                const courseNumber = course["@_id"];
                const key = `${subjectId}${courseNumber}`.toLowerCase().replace(/\s+/g, ''); // e.g. "ece408"

                // Create the entry
                const entry = {
                    title: `${subjectId} ${courseNumber}: ${course["#text"]}`,
                    year: year,
                    semester: semester,
                    website: `https://courses.illinois.edu/schedule/${year}/${semester}/${subjectId}/${courseNumber}`
                };

                // Add to the master object (using the Array-of-Semesters approach)
                if (!masterData[key]) {
                    masterData[key] = [];
                }
                masterData[key].push(entry);
            });
        }
        await sleep(1000);
    }
    
}

async function main() {
    const allCourses = {};

    if (manual) {
        await scrape(year, semester, allCourses);
    } else {
        // auto - loop all
        let i = 0
        for (const y of years) {
            for (const s of semesters) {
                if (i % 5) {
                    await sleep(2000);
                }
                await scrape(y, s, allCourses);
                i += 1;
            }
        }
    }
    console.log("Finalizing giant JSON file...");
    const filename = `uiuc_master_course_list.json`;
    await fs.writeFile(filename, JSON.stringify(allCourses, null, 2));
    console.log(`Success! All years saved to ${filename}`);
}

main();