console.log("Course extension loaded!");

let file = "";
let COURSE_DB = {}; // Will be loaded asynchronously
let isExtensionInitialized = false;

// Course selection mode state
let subjectSelectionMode = false;
let selectedSubject = null; // e.g., "cs" when user selects "CS 225" from dropdown

// Scan page panel state
let scanPanelVisible = false;


// storage
// {selectedUniversity : {name, code},
//   subjectSelectionMode,
//   selectedSubject
// }



// load initial settings from storage
chrome.storage.sync.get(['selectedUniversity', 'subjectSelectionMode', 'selectedSubject'], (result) => {

  // default is uiuc even if not selected in dropdown
  const uniCode = result.selectedUniversity ? result.selectedUniversity.code : 'uiuc'; 
  console.log("Current University Code:", uniCode);

  // Load course selection mode state -> initially false
  if (result.subjectSelectionMode) {
    subjectSelectionMode = result.subjectSelectionMode;
    console.log("Course Selection Mode:", subjectSelectionMode);
  }

  // Load selected course prefix ("CS")
  if (result.selectedSubject) {
    selectedSubject = result.selectedSubject.toLowerCase();
    console.log("Selected Course Prefix:", selectedSubject);
  }

  updateCourseDatabase(uniCode);
});


// on change listeners for update university, course selection mode, selected course
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "UPDATE_UNIVERSITY") {
    const newUni = request.university;    
    console.log("Switched to:", newUni.name);
    // Re-run highlighter with the new uni
    updateCourseDatabase(newUni.code);
  }
  // set global mode
  if (request.action === "SET_SUBJECT_SELECTION_MODE") {
    subjectSelectionMode = request.enabled;
    console.log("Course Selection Mode:", subjectSelectionMode ? "ON" : "OFF");
  }

  if (request.action === "UPDATE_SELECTED_SUBJECT") {
    selectedSubject = request.subject.toLowerCase();
    console.log("Selected Course Prefix:", selectedSubject);
  }

  if (request.action === "SCAN_PAGE") {
    const result = scanPageForCourses();

    // sends back status to display error code
    sendResponse(result); //{success: Boolean, message: String}
    return true; // Keep message channel open for async response
  }
});

// fetch json and assign to local variable COURSE_DB
// Calls initExtension only once
function updateCourseDatabase(uniCode) {

  file = "course_jsons/" + uniCode.toLowerCase() + ".json";

  // Load the JSON file using chrome.runtime.getURL api
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

// Scan page for all course matches
function scanPageForCourses() {
  // Remove existing panel if present
  const existingPanel = document.getElementById("course-scan-panel");
  if (existingPanel) {
    existingPanel.remove();
    scanPanelVisible = false;
    return { success: true, message: "Panel closed" };
  }

  // Get all text content from the page
  const pageText = document.body.innerText;
  
  // Build regex pattern from all course keys
  const courseKeys = Object.keys(COURSE_DB);
  if (courseKeys.length === 0) {
    console.log("No courses loaded");
    return { success: false, message: "Course database not loaded. Try selecting a university first." };
  }

  // Find all matches on the page
  const foundCourses = new Map(); // Use Map to avoid duplicates
  
  courseKeys.forEach(key => {
    // Create regex pattern that matches the course code with optional space
    // e.g., "cs225" matches "CS 225", "CS225", "cs 225", etc.
    const prefix = key.match(/^([a-zA-Z]+)/)?.[1] || "";
    const number = key.match(/([0-9]+.*)/)?.[1] || "";
    
    if (prefix && number) {
      // Pattern: prefix (optional space) number, case insensitive
      const pattern = new RegExp(`\\b${prefix}\\s*${number}\\b`, 'gi');
      const matches = pageText.match(pattern);
      
      if (matches && matches.length > 0) {
        foundCourses.set(key, {
          count: matches.length,
          data: COURSE_DB[key]
        });
      }
    }
  });

  // Check if any courses were found
  if (foundCourses.size === 0) {
    return { success: false, message: "No courses found on this page." };
  }

  // Create and display the panel
  createScanPanel(foundCourses);
  return { success: true, count: foundCourses.size };
}

// Create the floating panel to display found courses
function createScanPanel(foundCourses) {
  const panel = document.createElement("div");
  panel.id = "course-scan-panel";
  
  // Panel styles
  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "450px",
    maxHeight: "450px",
    background: "#1a1a1a",
    color: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    zIndex: "999999",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    overflow: "hidden"
  });

  // Header
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "12px 16px",
    background: "#2a2a2a",
    borderBottom: "1px solid #444",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "move"
  });

  const title = document.createElement("span");
  title.id = "scan-panel-title";
  title.textContent = `Courses on this page (${foundCourses.size})`;
  title.style.fontWeight = "bold";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0 4px"
  });
  closeBtn.addEventListener("click", () => {
    panel.remove();
    scanPanelVisible = false;
  });

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Search bar container
  const searchContainer = document.createElement("div");
  Object.assign(searchContainer.style, {
    padding: "8px 16px",
    borderBottom: "1px solid #444",
    background: "#222"
  });

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search courses...";
  searchInput.id = "scan-panel-search";
  Object.assign(searchInput.style, {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #444",
    borderRadius: "6px",
    background: "#333",
    color: "white",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box"
  });
  searchInput.addEventListener("focus", () => searchInput.style.borderColor = "#60a5fa");
  searchInput.addEventListener("blur", () => searchInput.style.borderColor = "#444");

  searchContainer.appendChild(searchInput);
  panel.appendChild(searchContainer);

  // Content area (scrollable)
  const content = document.createElement("div");
  content.id = "scan-panel-content";
  Object.assign(content.style, {
    padding: "8px 0",
    maxHeight: "340px",
    overflowY: "auto"
  });

  // Function to render course rows
  function renderCourseRows(filterText = "") {
    content.innerHTML = "";
    const query = filterText.toLowerCase();

    // Sort courses alphabetically by key
    const sortedKeys = Array.from(foundCourses.keys()).sort();
    let visibleCount = 0;
    
    sortedKeys.forEach(key => {
      const { data } = foundCourses.get(key);
      const courseArray = Array.isArray(data) ? data : [data];
      
      // Get first (most recent) entry
      const firstEntry = courseArray[0];
      const courseCode = key.toUpperCase();
      const courseName = firstEntry.title.split(":")[1]?.trim() || firstEntry.title;
      const website = firstEntry.website;

      // Filter by search query
      if (query && !courseCode.toLowerCase().includes(query) && !courseName.toLowerCase().includes(query)) {
        return;
      }

      visibleCount++;

      const row = document.createElement("div");
      Object.assign(row.style, {
        padding: "8px 16px",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      });
      row.addEventListener("mouseenter", () => row.style.background = "#2a2a2a");
      row.addEventListener("mouseleave", () => row.style.background = "transparent");

      // Course code
      const codeSpan = document.createElement("span");
      codeSpan.textContent = courseCode;
      Object.assign(codeSpan.style, {
        fontWeight: "bold",
        color: "#60a5fa",
        minWidth: "70px"
      });

      // Course title
      const titleSpan = document.createElement("span");
      titleSpan.textContent = courseName;
      Object.assign(titleSpan.style, {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      });

      // Website link
      const link = document.createElement("a");
      link.href = website;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "→";
      Object.assign(link.style, {
        color: "#60a5fa",
        textDecoration: "none",
        fontSize: "16px"
      });

      row.appendChild(codeSpan);
      row.appendChild(titleSpan);
      row.appendChild(link);
      content.appendChild(row);
    });

    // Update title with visible count
    const titleEl = document.getElementById("scan-panel-title");
    if (titleEl) {
      if (query) {
        titleEl.textContent = `Showing ${visibleCount} of ${foundCourses.size} courses`;
      } else {
        titleEl.textContent = `Courses on this page (${foundCourses.size})`;
      }
    }

    // Show no matches message if filtering returned nothing
    if (visibleCount === 0 && query) {
      const noMatches = document.createElement("div");
      noMatches.textContent = `No courses matching "${filterText}"`;
      noMatches.style.padding = "16px";
      noMatches.style.color = "#999";
      content.appendChild(noMatches);
    }
  }

  // Add search input listener
  searchInput.addEventListener("input", (e) => {
    renderCourseRows(e.target.value);
  });

  // Initial render
  renderCourseRows();

  panel.appendChild(content);
  document.body.appendChild(panel);
  scanPanelVisible = true;

  // Focus search input
  searchInput.focus();

  // Make panel draggable
  makeDraggable(panel, header);
}

// Make an element draggable
function makeDraggable(element, handle) {
  let offsetX = 0, offsetY = 0, startX = 0, startY = 0;

  handle.addEventListener("mousedown", dragStart);

  function dragStart(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);
  }

  function drag(e) {
    e.preventDefault();
    offsetX = startX - e.clientX;
    offsetY = startY - e.clientY;
    startX = e.clientX;
    startY = e.clientY;
    element.style.top = (element.offsetTop - offsetY) + "px";
    element.style.left = (element.offsetLeft - offsetX) + "px";
    element.style.right = "auto";
  }

  function dragEnd() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", dragEnd);
  }
}

// only run once, attach event listeners to highlighting on mouseup, if match found
// createTooltip, positionTooltip using COURSE_DB which only changes when 
// university changes.
// if mousedown outside tooltip, remove tooltip

function initializeExtension() {

  function getHighlightedText() {
    return window.getSelection().toString();
  }

  function createTooltip(courseData, match) {
    const tooltip = document.createElement("div");
    tooltip.id = "course-tooltip";
    // click on tooltip don't do anything
    tooltip.addEventListener("mousedown", e => e.stopPropagation());
    tooltip.addEventListener("mouseup", e => e.stopPropagation());

    tooltip.style.position = "absolute";
    tooltip.style.background = "#1a1a1a";
    tooltip.style.color = "white";
    tooltip.style.padding = "12px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.maxWidth = "350px";
    tooltip.style.maxHeight = "300px";
    tooltip.style.overflowY = "auto";
    tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    tooltip.style.zIndex = "999999";
    tooltip.style.fontSize = "14px";

    if (match) {
      // Ensure courseData is always an array
      const dataArray = Array.isArray(courseData) ? courseData : [courseData];
      
      // 1. Define Semester Priority (Higher number = more recent)
      const semesterOrder = {
        "Winter": 4,
        "Fall": 3,
        "Summer": 2,
        "Spring": 1
      };

      // 2. Sort courseData: Most recent first
      const sortedData = dataArray.sort((a, b) => {
        // First compare years
        if (parseInt(b.year) !== parseInt(a.year)) {
          return parseInt(b.year) - parseInt(a.year);
        }
        // If years are equal, compare semester priority
        const orderA = semesterOrder[a.semester] || 0;
        const orderB = semesterOrder[b.semester] || 0;
        return orderB - orderA;
      });

      const courseCode = sortedData[0].title.split(":")[0].trim();

      // 3. Use sortedData to create semester entries
      const semesterEntries = sortedData.map(entry => {
        const courseName = entry.title.split(":")[1]?.trim() || entry.title;
        return `
          <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #444;">
            <div><strong>${entry.semester ? entry.semester : "No semester info."} ${entry.year ? entry.year : "No year info"}</strong></div>
            <div style="color: #ccc; font-size: 12px;">${courseName}</div>
            <a href="${entry.website}" target="_blank" rel="noopener noreferrer" 
              style="color: #60a5fa; font-size: 12px;">
              Course Website
            </a>
          </div>
        `;
      }).join("");

      // tooltip title + semester entiries
      tooltip.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">${courseCode}</div>
        ${semesterEntries}
      `;
    } else {
      tooltip.style.background = "#b91c1c";
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
    console.log(highlightedText);
    if (!highlightedText || highlightedText.length < 1 || highlightedText.length > 30) return; // Ignore tiny highlights
    
    let lookupKey;



    if (subjectSelectionMode && selectedSubject) {
      // In course selection mode: prepend the selected course prefix to the highlighted number
      // e.g., if selectedSubject is "cs" and user highlights "225", lookup "cs225"
      const normalizedHighlight = normalize(highlightedText);
      lookupKey = selectedSubject + normalizedHighlight;
      console.log("Course Selection Mode - Combined key:", lookupKey);
    } else {
      // Normal mode: use the full highlighted text as-is
      lookupKey = normalize(highlightedText);
    }

    console.log("Lookup key:", JSON.stringify(lookupKey));
    console.log("Lookup result:", COURSE_DB[lookupKey]);

    console.log("Sample keys:", Object.keys(COURSE_DB).slice(0, 5));
    const courseData = COURSE_DB[lookupKey];
    
    if (courseData) {
      // Show match
      console.log("Found course:", courseData);
      const tooltip = createTooltip(courseData, true);
      document.body.appendChild(tooltip);
      positionTooltip(tooltip);
    } else {
      console.log("No matching course found.");
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
  // remove tooltip on any click outside
  document.addEventListener("mousedown", (e) => {
    const tooltip = document.getElementById("course-tooltip");
    if (tooltip && !tooltip.contains(e.target)) {
      removeTooltip();
    }
  });
}

// Normalize function moved outside initializeExtension so it can be used globally
function normalize(text) {
  // Replace all whitespace with nothing and convert to lowercase
  return text.toLowerCase().replace(/\s+/g, "");
}