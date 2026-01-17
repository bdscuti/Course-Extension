const fs = require('fs/promises');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// 1. Setup Arguments (Year and Semester)
const args = process.argv.slice(2);
const year = args[0] || '2026';
const semester = args[1] || 'spring';

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

async function scrape() {
    console.log(`Starting scrape for ${semester} ${year}...`);

    // Fetch the list of subjects (e.g., CS, ECE)
    const semesterUrl = `${BASE_URL}/${year}/${semester}.xml`;
    console.log(`DEBUG: Target URL is ${semesterUrl}`); 
    const rootData = await fetchXML(semesterUrl);
    console.log("DEBUG: Data received:", rootData ? "YES" : "NO");

    if (!rootData || !rootData.term || !rootData.term.subjects) {
        console.error("Could not find subject list. Check year/semester inputs.");
        return;
    }

    // Handle case where there is only one subject (parser returns object) vs multiple (array)
    let subjects = rootData.term.subjects.subject;
    if (!Array.isArray(subjects)) subjects = [subjects];

    console.log(`Found ${subjects.length} subjects.`);
    
    const coursesData = {};

    // Loop through every subject
    for (const sub of subjects) {
        const subjectId = sub["@_id"];
        const subjectHref = sub["@_href"]; // The API link to get courses

        // console.log(`Processing ${subjectId}...`); // Verbose logging

        const subjectData = await fetchXML(subjectHref);
        
        if (subjectData && subjectData.subject && subjectData.subject.courses) {
            let courses = subjectData.subject.courses.course;
            if (!Array.isArray(courses)) courses = [courses];

            courses.forEach(course => {
                const courseNumber = course["@_id"]; // e.g., "342"
                const courseTitle = course["#text"] || "No Title";
                
                // Key: "ece 342"
                const key = `${subjectId} ${courseNumber}`.toLowerCase();
                
                // Title: "ECE 342: Electronic Circuits"
                const fullTitle = `${subjectId} ${courseNumber}: ${courseTitle}`;

                // Website: https://courses.illinois.edu/schedule/2026/spring/CS/101
                const webUrl = `https://courses.illinois.edu/schedule/${year}/${semester}/${subjectId}/${courseNumber}`;

                coursesData[key] = {
                    title: fullTitle,
                    description: fullTitle, // Using title as desc per your request
                    website: webUrl
                };
            });
        }

        // Be polite to the API
        await sleep(50); 
    }

    // Sort keys alphabetically
    const sortedData = Object.keys(coursesData).sort().reduce((obj, key) => {
        obj[key] = coursesData[key];
        return obj;
    }, {});

    const filename = `courses_${year}_${semester}.json`;
    await fs.writeFile(filename, JSON.stringify(sortedData, null, 2));
    
    console.log(`Success! Saved ${Object.keys(sortedData).length} courses to ${filename}`);
}

scrape();