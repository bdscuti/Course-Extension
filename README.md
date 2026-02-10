# Course-Extension

Chrome Extension Link: 
Oftentimes, people simply list course codes (like ECE 391) assuming the reader already knows what they are talking about. 
A frustrating experience when browsing is that it requires jumping across multiple sites to find the correct course catalog listing and course description.

This project aims to address that.
First you select your university of interest by clicking on the extension icon. You can select your university by dropdown or enter into the searchbox and matching universities will be filtered through.
When your university has been selected, it will set the chrome.sync.storage's selectedUniversity key to your selected university. This allows the selected university (along with selectedSubject, subjectSelectionMode) to persist even after you close the popup across sessions. 



<img width="461" height="759" alt="image" src="https://github.com/user-attachments/assets/4f5f1e63-5878-4069-b706-59655a9d5a3f" />



It passes a message to the active tab via chrome.tabs api to content.js which loads the respective JSON to COURSE_DB.
Then, then you highlight some text  a tooltip will pop up showing past semester offerings of the class with its title and webpage.


![Screenshot-2026-02-09-221129-_4_](https://github.com/user-attachments/assets/aba4544a-180a-4b90-87ff-cd31cd93963c)



Course Number Selection Mode:
When toggled on, you can select your subject of interest from the dropdown. Upon highlighting a course number, the course number will be appended to the prefix and key to the COURSE_DB as before.

Scan Page for Courses:
Uses regex to statically parse all first loaded html. I am considering on expanding to use mutation observer for dynamic updates.

This currently only supports UIUC classes. Cornell is kind of janky.



How to Contribute:
Inside ./scrapers, you can find example scraping scripts for UIUC and Cornell. UIUC was especially simple as the course catalog's had standardized URLs to XML files.
I used a simple timeout delay between calls.

./course_jsons contains JSONS of the each university's scraped course catalog in the following format where the key is the course code and the value is array of semester offerings.

```
{
  "COURSE_CODE": [ // "aas100"
    {
      "title": "string", // "AAS 100: Intro Asian American Studies"
      "year": number, // 2016
      "semester": "string", // "spring"
      "website": "string" // "https://courses.illinois.edu/schedule/2016/spring/AAS/100"
    },
      "title": "string", //"AAS 100: Intro Asian American Studies"
      "year": number, //2026
      "semester": "string", // "spring"
      "website": "string" // "https://courses.illinois.edu/schedule/2026/spring/AAS/100"
    },
    ...
  ]
}

```

After following the above json format, you can add to universities.json in the following format:

```
[
  { "name": "University of Illinois Urbana-Champaign", "code": "uiuc" },
  { "name": "Cornell University", "code": "cornell" }
]
```

To experiment on your own device:
1) Download the zip file and unzip.
2) Navigate to chrome://extensions.
3) Turn on developer mode on the upper right corner.
4) Click "load unpacked" and select the folder.
5) Check if the extension is active by developer tools and verifying if you see "Course extension loaded!" in the console.
<img width="521" height="428" alt="image" src="https://github.com/user-attachments/assets/8ac7ce15-1019-428c-98d0-3c4031ef25d5" />

Features to be added:
Add full support for Cornell as well, since there API is easy to work with.
Create a prereq chain visualizer.
Create a contributor page, so that users can manually import enter information for universities that do not have APIs.
Mutation Observer


Change Logs:
2/9/2026: Added static page text scan and course number selection mode.








