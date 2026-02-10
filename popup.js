// const universities = [
  //   uni = { name: "University of Illinois Urbana-Champaign", code: "uiuc" },
  //   { name: "Cornell University", code: "cornell" }
  // ];


// send message
// {
//   action: "UPDATE_UNIVERSITY",
//   university: uni
// }
// { action: "SET_subject_SELECTION_MODE",
//   enabled: subjectSelectionMode }
// {
//   action: "UPDATE_SELECTED_subject",
//   subject: subject
// }

let universities = undefined;

async function getUniversities() {
  try {
    const uniUrl = chrome.runtime.getURL(`./universities.json`);
    const response = await fetch(uniUrl);
    universities = await response.json();
  } catch (error) {
    console.error('Failed to load universities:', error);
  }
}


// const universities = [
//   { name: "University of Illinois Urbana-Champaign", code: "uiuc" },
//   { name: "Cornell University", code: "cornell" }
// ];

document.addEventListener('DOMContentLoaded', async () => {
  // University dropdown elements
  await getUniversities();
  const universityWrapper = document.getElementById('university-wrapper');
  const universitySelectBtn = universityWrapper.querySelector('.select-btn');
  const universitySelectBtnText = universitySelectBtn.querySelector('span');
  const universitySearchInput = universityWrapper.querySelector('input');
  const universityOptionsList = universityWrapper.querySelector('.options');

  // subject dropdown elements
  const subjectWrapper = document.getElementById('subject-wrapper');
  const subjectSelectBtn = subjectWrapper.querySelector('.select-btn');
  const subjectSelectBtnText = subjectSelectBtn.querySelector('span');
  const subjectSearchInput = subjectWrapper.querySelector('input');
  const subjectOptionList = subjectWrapper.querySelector('.options');

  // Toggle element
  const subjectModeToggle = document.getElementById('subject-mode-toggle');

  // Scan page button
  const scanPageBtn = document.getElementById('scan-page-btn');


  let selectedUniversity = null;
  let selectedSubject = null;
  let subjectKeys = [];
  let subjectSelectionMode = false;

  // Load saved state on popup open
  chrome.storage.sync.get(['selectedUniversity', 'selectedSubject', 'subjectSelectionMode'], (result) => {
    
    // select university affects what subjects gets in subject-wrapper options
    if (result.selectedUniversity) {
      selectedUniversity = result.selectedUniversity;
      universitySelectBtnText.textContent = selectedUniversity.name;
      loadsubjectKeys(selectedUniversity.code);
    }

    if (result.subjectSelectionMode) {
      subjectSelectionMode = result.subjectSelectionMode;
      subjectModeToggle.checked = subjectSelectionMode;
      subjectWrapper.style.display = subjectSelectionMode ? 'block' : 'none';
    }

    // if a subject has alreaddy been selected
    if (result.selectedSubject) {
      selectedSubject = result.selectedSubject;
      subjectSelectBtnText.textContent = selectedSubject;
    }
    // handle in case to prev university / subject has been selected
    renderUniversityOptions();
  });

  // Load subject (unique subject codes) from JSON file based on university
  async function loadsubjectKeys(universityCode) {
    try {
      const url = chrome.runtime.getURL(`course_jsons/${universityCode}.json`);
      const response = await fetch(url);
      const data = await response.json();
      
      // Extract unique subject subjects from keys (e.g., "cs225" -> "CS")
      const subjects = new Set();
      Object.keys(data).forEach(key => {
        const match = key.match(/^([a-zA-Z]+)/);
        if (match) {
          subjects.add(match[1].toUpperCase());
        }
      });
      
      // Sort alphabetically
      subjectKeys = Array.from(subjects).sort();
      renderSubjectOptions();
    } catch (error) {
      console.error('Error loading subject keys:', error);
      subjectKeys = [];
      renderSubjectOptions();
    }
  }

  // Render university options with typing filtering
  function renderUniversityOptions(filterText = '') {
    if (!universities) return;
    const query = filterText.toLowerCase();
    universityOptionsList.innerHTML = '';

    const matches = universities.filter(uni =>
      uni.name.toLowerCase().includes(query) ||
      uni.code.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
      matches.forEach(uni => {
        const isSelected = selectedUniversity?.code === uni.code ? 'selected' : '';
        const li = document.createElement('li');
        li.className = isSelected;
        li.textContent = uni.name;
        li.addEventListener('click', () => selectUniversityHandler(uni));
        universityOptionsList.appendChild(li);
      });
    } else {
      universityOptionsList.innerHTML = '<p style="margin-top: 10px; font-size: 20px; color: #ff0000;">Oops! University not found</p>';
    }
  }
  // Handle university selection
  function selectUniversityHandler(uni) {
    selectedUniversity = uni;
    universitySelectBtnText.textContent = uni.name;
    universitySearchInput.value = '';
    universityWrapper.classList.remove('active');
    renderUniversityOptions();

    // Reset subject selection when university changes
    selectedSubject = null;
    subjectSelectBtnText.textContent = 'Select subject';

    // Load new subject keys
    loadsubjectKeys(uni.code);

    // Save to Chrome storage
    chrome.storage.sync.set({ 
      selectedUniversity: uni,
      selectedSubject: null 
    }, () => {
      updateActiveTab({
        action: "UPDATE_UNIVERSITY",
        university: uni
      });
    });
  }

  
  // Render subject subject options html. May not be visible unless 
  // subject-wrapper.wrapper active and display : block.
  // Filters out subjects according to subject search box.
  // Attaches event listeners with callback to selectsubjectHandler to subjects

  // TODO: rename subjects to subjects. 
  function renderSubjectOptions(filterText = '') {
    const query = filterText.toLowerCase();
    subjectOptionList.innerHTML = '';

    if (!selectedUniversity) {
      subjectOptionList.innerHTML = '<p style="margin-top: 10px; font-size: 16px; color: #999;">Please select a university first</p>';
      return;
    }

    const matches = subjectKeys.filter(subject =>
      subject.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
      matches.forEach(subject => {
        const isSelected = selectedSubject === subject ? 'selected' : '';
        const li = document.createElement('li');
        li.className = isSelected;
        li.textContent = subject;
        li.addEventListener('click', () => selectsubjectHandler(subject));
        subjectOptionList.appendChild(li);
      });
    } else {
      subjectOptionList.innerHTML = '<p style="margin-top: 10px; font-size: 20px; color: #ff0000;">Oops! Subject not found</p>';
    }
  }

  // Upon subject click. Hide subjectWrapper, selectBtnText, set storage, and send message
  function selectsubjectHandler(subject) {
    selectedSubject = subject;
    subjectSelectBtnText.textContent = subject;
    subjectSearchInput.value = '';
    subjectWrapper.classList.remove('active');
    // rerender for the new selectedSubject
    renderSubjectOptions();

    // Save to Chrome storage
    chrome.storage.sync.set({ selectedSubject: subject }, () => {
      updateActiveTab({
        action: "UPDATE_SELECTED_SUBJECT",
        subject: subject
      });
    });
  }



  // Handle subject selection mode toggle
  subjectModeToggle.addEventListener('change', () => {
    // technically a checkbox
    subjectSelectionMode = subjectModeToggle.checked;
    subjectWrapper.style.display = subjectSelectionMode ? 'block' : 'none';

    // Save to Chrome storage
    chrome.storage.sync.set({ subjectSelectionMode: subjectSelectionMode }, () => {
      updateActiveTab({
        action: "SET_SUBJECT_SELECTION_MODE",
        enabled: subjectSelectionMode
      });
    });
  });

  // Handle scan page button click
  scanPageBtn.addEventListener('click', () => {
    // Remove any existing error message
    const existingError = document.getElementById('scan-error-message');
    if (existingError) existingError.remove();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SCAN_PAGE" }, (response) => {
          if (response && response.success) {
            // subjects found, close popup
            // window.close();
          } else {
            // No subjects found or error, show error message
            showScanError(response?.message || "No subjects found on this page.");
          }
        });
      }
    });
  });

  // Show temporary error message in popup
  function showScanError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'scan-error-message';
    errorDiv.textContent = message;
    Object.assign(errorDiv.style, {
      marginTop: '12px',
      padding: '10px 14px',
      background: '#fee2e2',
      color: '#b91c1c',
      borderRadius: '6px',
      fontSize: '13px',
      textAlign: 'center',
      animation: 'fadeIn 0.2s ease'
    });

    // Insert after scan button
    scanPageBtn.insertAdjacentElement('afterend', errorDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      errorDiv.style.transition = 'opacity 0.3s ease';
      setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
  }

  // Send message to content script
  function updateActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }

  // Toggle university dropdown on button click
  universitySelectBtn.addEventListener('click', () => {
    universityWrapper.classList.toggle('active');
    // Close subject dropdown if open
    subjectWrapper.classList.remove('active');
  });

  // Toggle subject dropdown on button click
  subjectSelectBtn.addEventListener('click', () => {
    subjectWrapper.classList.toggle('active');
    // Close university dropdown if open
    universityWrapper.classList.remove('active');
  });

  // Filter university options as user types
  universitySearchInput.addEventListener('keyup', () => {
    renderUniversityOptions(universitySearchInput.value);
  });

  // Filter subject options as user types
  subjectSearchInput.addEventListener('keyup', () => {
    renderSubjectOptions(subjectSearchInput.value);
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!universityWrapper.contains(e.target)) {
      universityWrapper.classList.remove('active');
    }
    if (!subjectWrapper.contains(e.target)) {
      subjectWrapper.classList.remove('active');
    }
  });

  // Initialize options lists
  renderUniversityOptions();
  renderSubjectOptions();
});