const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
// Change to 'SP26' or 'FA25' as needed
const ROSTER = 'SP26'; 
const SUBJECTS_URL = `https://classes.cornell.edu/api/2.0/config/subjects.json?roster=${ROSTER}`;
const CLASSES_BASE_URL = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${ROSTER}&subject=`;

const OUTPUT_DIR = 'course_jsons';
const OUTPUT_FILE = 'courses.json';

// --- Main Logic ---

// 1. Fetch the list of Subject codes (e.g., ["MATH", "CS", "ECE"])
async function fetchSubjects() {
    console.log(`Fetching subject list for roster ${ROSTER}...`);
    try {
        const response = await axios.get(SUBJECTS_URL);
        // The API returns { data: { subjects: [ { value: "MATH"... } ] } }
        return response.data.data.subjects.map(s => s.value);
    } catch (error) {
        console.error('Error fetching subjects:', error.message);
        return [];
    }
}

// 2. Fetch classes for a single subject
async function fetchClassesForSubject(subjectCode) {
    const url = `${CLASSES_BASE_URL}${subjectCode}`;
    try {
        const response = await axios.get(url);
        return response.data.data.classes;
    } catch (error) {
        console.error(`Error fetching classes for ${subjectCode}:`, error.message);
        return [];
    }
}

// 3. Orchestrator
async function main() {
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR);
    }

    const subjects = await fetchSubjects();
    const finalCourseData = {};

    console.log(`Found ${subjects.length} subjects. Starting scrape...`);

    // Loop through all subjects
    // We use a for...of loop to handle async/await properly
    for (const subject of subjects) {
        console.log(`Processing subject: ${subject}`);
        
        const classes = await fetchClassesForSubject(subject);

        classes.forEach(cls => {
            const subjectCode = cls.subject; // e.g., "MATH"
            const catalogNbr = cls.catalogNbr; // e.g., "1006"
            const titleLong = cls.titleLong; // e.g., "Academic Support for MATH 1106"
            
            // Generate the key: "math 1006"
            const courseKey = `${subjectCode}${catalogNbr}`.toLowerCase();
            
            // Generate the title: "MATH 1006: Academic Support for MATH 1106"
            const formattedTitle = `${subjectCode} ${catalogNbr}: ${titleLong}`;

            // Generate the website URL based on standard Cornell roster patterns
            const websiteUrl = `https://classes.cornell.edu/browse/roster/${ROSTER}/class/${subjectCode}/${catalogNbr}`;

            // Use description if available, otherwise fallback to title
            const description = cls.description ? cls.description : formattedTitle;

            // Assign to the final object
            finalCourseData[courseKey] = {
                "title": formattedTitle,
                "description": description,
                "website": websiteUrl
            };
        });

        // Optional: Small delay to avoid rate-limiting (politeness)
        await new Promise(r => setTimeout(r, 200));
    }

    // Write to file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(finalCourseData, null, 4));

    console.log(`\nSuccess! Processed ${Object.keys(finalCourseData).length} courses.`);
    console.log(`File saved to: ${outputPath}`);
}

main();