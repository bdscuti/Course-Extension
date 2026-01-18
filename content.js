console.log("Course extension loaded!");

let file = "";
let COURSE_DB = {}; // Will be loaded asynchronously
let isExtensionInitialized = false;


// on start
chrome.storage.sync.get(['selectedUniversity'], (result) => {

  const uniCode = result.selectedUniversity ? result.selectedUniversity.code : 'uiuc'; 
  console.log("Current University Code:", uniCode);

  updateCourseDatabase(uniCode);
});


// on change
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "UPDATE_UNIVERSITY") {
    const newUni = request.university;    
    console.log("Switched to:", newUni.name);
    // Re-run highligher with the new uni
    updateCourseDatabase(newUni.code);
  }
});

function updateCourseDatabase(uniCode) {
  file = "course_jsons/" + uniCode.toLowerCase() + "_2026_sp.json";
  

  // Load the JSON file
  fetch(chrome.runtime.getURL(file))
    .then(response => response.json())
    .then(data => {
      COURSE_DB = data;
      console.log(`Loaded ${Object.keys(COURSE_DB).length} courses`);
      if (!isExtensionInitialized) {
        initializeExtension();
        isExtensionInitialized = true;
      }
    })
    .catch(error => {
      console.log(file);
      console.error("Failed to load courses.json:", error);
      // Fallback to basic data
      console.log("Fallback data not implemented");
    });
}


function initializeExtension() {
  // All your existing functions go here, unchanged
  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function getHighlightedText() {
    return window.getSelection().toString();
  }

  function createTooltip(courseData, match) {
    const tooltip = document.createElement("div");
    tooltip.id = "course-tooltip";
    // <div class="tooltip-description">${courseData.description}</div>
    tooltip.addEventListener("mousedown", e => e.stopPropagation());
    tooltip.addEventListener("mouseup", e => e.stopPropagation());
    
    // css stylin
    tooltip.style.position = "absolute";
    tooltip.style.background = "#1a1a1a";
    tooltip.style.color = "white";
    tooltip.style.padding = "12px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.maxWidth = "300px";
    tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    tooltip.style.zIndex = "999999";
    tooltip.style.fontSize = "14px";

    if (match) {
      tooltip.innerHTML = `
      <div class="tooltip-title">${courseData.title}</div>
      <a href="${courseData.website}" target="_blank" rel="noopener noreferrer" style="color:red">
        Website Link
      </a>`;
    } else {
      // Warning Style for No Match
      tooltip.style.background = "#b91c1c"; // Reddish background for warning
      tooltip.innerHTML = `<span>⚠️ No course found for this selection.</span>`;
    }
    
    return tooltip;
  }

  function positionTooltip(tooltip) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    tooltip.style.left = rect.left + window.scrollX + "px";
    tooltip.style.top = rect.top + window.scrollY - tooltip.offsetHeight - 10 + "px";
  }

  function removeTooltip() {
    const existing = document.getElementById("course-tooltip");
    if (existing) existing.remove();
  }

  // Start of Event Listeners.
  document.addEventListener("mouseup", () => {
    removeTooltip();
    
    const highlightedText = getHighlightedText();
    if (!highlightedText || highlightedText.length < 2 || highlightedText.length > 30) return; // Ignore tiny highlights
    
    const normalized = normalize(highlightedText);
    const courseData = COURSE_DB[normalized];
    
    if (courseData) {
      // Show match
      const tooltip = createTooltip(courseData, true);
      document.body.appendChild(tooltip);
      positionTooltip(tooltip);
    } 
    
    // else {
    //   // Show "No Match" warning
    //   const tooltip = createTooltip(null, false);
    //   document.body.appendChild(tooltip);
    //   positionTooltip(tooltip);
      
    //   setTimeout(() => {
    //     const existing = document.getElementById("course-tooltip");
    //     if (existing && existing.innerText.includes("No course found")) {
    //         existing.remove();
    //     }
    //   }, 1000);
    // }
  });

  document.addEventListener("mousedown", (e) => {
    const tooltip = document.getElementById("course-tooltip");
    if (tooltip && !tooltip.contains(e.target)) {
      removeTooltip();
    }
  });
}