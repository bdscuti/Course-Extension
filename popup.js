document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('uni-input');
  const suggestionsList = document.getElementById('suggestions-list');
  const statusMsg = document.getElementById('status-message');
  const clearBtn = document.getElementById('clear-btn');

  const universities = [
    { name: "University of Illinois Urbana-Champaign", code: "uiuc" },
    { name: "Cornell University", code: "cornell" },
    { name: "Stanford University", code: "stanford" },
    { name: "MIT", code: "mit" }
  ];

  // Helper to show/hide the X button
  const toggleClearBtn = () => {
    clearBtn.style.display = input.value.length > 0 ? 'block' : 'none';
  };

  chrome.storage.sync.get(['selectedUniversity'], (result) => {
    if (result.selectedUniversity) {
      input.value = result.selectedUniversity.name;
      toggleClearBtn();
    }
  });

  function renderSuggestions(filterText = '') {
    const query = filterText.toLowerCase();
    suggestionsList.innerHTML = '';

    const matches = universities.filter(uni => 
      uni.name.toLowerCase().includes(query) || 
      uni.code.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
      matches.forEach(uni => {
        const li = document.createElement('li');
        li.textContent = uni.name;
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          selectUniversity(uni);
        });
        suggestionsList.appendChild(li);
      });
      suggestionsList.classList.remove('hidden');
    } else {
      suggestionsList.classList.add('hidden');
    }
  }

  input.addEventListener('focus', () => renderSuggestions(input.value));
  
  input.addEventListener('input', () => {
    renderSuggestions(input.value);
    toggleClearBtn();
  });

  // Clear Button Logic
  clearBtn.addEventListener('click', () => {
    input.value = '';
    toggleClearBtn();
    suggestionsList.classList.add('hidden');
    input.focus();
    
    // Clear from storage
    chrome.storage.sync.remove('selectedUniversity', () => {
      statusMsg.textContent = 'Selection cleared.';
      setTimeout(() => statusMsg.textContent = '', 2000);
    });
  });

  function selectUniversity(uni) {
    input.value = uni.name;
    toggleClearBtn();
    suggestionsList.classList.add('hidden');

    chrome.storage.sync.set({ selectedUniversity: uni }, () => {
      statusMsg.textContent = 'Saved!';
      setTimeout(() => statusMsg.textContent = '', 2000);
      updateActiveTab(uni);
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      suggestionsList.classList.add('hidden');
    }
  });

  function updateActiveTab(uni) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if(tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "UPDATE_UNIVERSITY",
          university: uni
        });
      }
    });
  }
});