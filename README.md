# Course-Extension
 
Oftentimes, people simply list course codes (like ECE 391) assuming the reader already knows what they are talking about. 
A frustrating experience when browsing is that it requires jumping across multiple sites to find the correct course catalog listing and course description.

To use
1) Download the zip file and unzip.
2) Navigate to chrome://extensions.
3) Turn on developer mode on the upper right corner.
4) Click "load unpacked" and select the folder.
5) Check if the extension is active by developer tools and verifying if you see "Course extension loaded!" in the console.
<img width="521" height="428" alt="image" src="https://github.com/user-attachments/assets/8ac7ce15-1019-428c-98d0-3c4031ef25d5" />

This project aims to address that.
First you select your university of interest by clicking on the extension icon. You can select your university by dropdown or enter into the searchbox and matching universities will be filtered through.
When your university has been selected, it will set the chrome.sync.storage's selectedUniversity key to your selected university. This allows the selected university to persist after your close the popup and 
across sessions. It passes a message to content.js which loads the respective JSON to COURSE_DB.
Then, you highlight some text and a tooltip will pop up showing past semester offerings of the class with its title and webpage.
This currently only supports UIUC classes but I hope to expand it to more universities using course catalog APIs and allow contributors to modify the database.
Currently, it uses a scraper that makes API calls, but it there has to be significant delays between calls to prevent being blocked from the catalog. It takes the XML or JSON and creates a massive JSON file
keyed by course code, storing an array of objects of past semester course offerings.


Features to be added:
Add full support for Cornell as well, since there API is easy to work with.
Allow the user to select from a submenu for the specific subject so that they only have to highlight the course number (eg. 391 instead of ECE 391). 
Create a prereq chain visualizer.
Futhermore, I hope to add a second mode that scans and add course tooltips to all the matched courses on a page.
Create a contributor page, so that users can manually import enter information for universities that do not have APIs.




