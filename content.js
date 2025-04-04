(() => {
  let panel;
  let panelVisible = false;
  let lastVideoId;

  // Wait for youtube controls to be available
  function waitForPlayerControls(callback) {
    const checkInterval = setInterval(() => {
      const controls = document.querySelector(".ytp-right-controls");
      if (controls) {
        clearInterval(checkInterval);
        callback();
      }
    }, 500);
  }

  // Format seconds to mm:ss
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function waitForBody(callback) {
    if (document.body) {
      callback();
    } else {
      const interval = setInterval(() => {
        if (document.body) {
          clearInterval(interval);
          callback();
        }
      }, 100);
    }
  }

  // Render bookmarks panel
  function renderBookmarks(bookmarks, panel) {
    panel.innerHTML = "<strong>Bookmarks</strong><br>";

    // Add bookmark button
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Add Bookmark";
    addBtn.style.margin = "6px 0";
    addBtn.style.padding = "4px 8px";
    addBtn.style.border = "none";
    addBtn.style.borderRadius = "4px";
    addBtn.style.backgroundColor = "#1a73e8";
    addBtn.style.color = "white";
    addBtn.style.cursor = "pointer";
    addBtn.style.fontSize = "13px";

    addBtn.addEventListener("click", () => {
      const video = document.querySelector("video");
      if (!video) return;

      const time = Math.floor(video.currentTime);
      const label = `Bookmark at ${formatTime(time)}`;
      const storageKey = getStorageKey();

      chrome.storage.local.get([storageKey], (result) => {
        const bookmarks = result[storageKey] || [];
        const newBookmark = { time, label };
        bookmarks.push(newBookmark);
        bookmarks.sort((a, b) => a.time - b.time);

        chrome.storage.local.set({ [storageKey]: bookmarks }, () => {
          chrome.storage.local.get([storageKey], (fresh) => {
            renderBookmarks(fresh[storageKey] || [], panel);
          });
        });
      });
    });

    panel.appendChild(addBtn);
    panel.appendChild(document.createElement("hr"));

    if (bookmarks.length === 0) {
      const msg = document.createElement("em");
      msg.textContent = "No bookmarks yet";
      panel.appendChild(msg);
      return;
    }

    // Create div for each bookmark
    bookmarks.forEach((b, index) => {
      const item = document.createElement("div");
      item.style.margin = "4px 0";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.gap = "6px";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "6px";

      const label = document.createElement("span");
      label.textContent = b.label;
      label.style.cursor = "pointer";
      label.addEventListener("click", () => {
        const video = document.querySelector("video");
        if (video) {
          video.currentTime = b.time;
          video.play();
        }
      });

      // Rename bookmark
      const rename = document.createElement("span");
      rename.textContent = "✏️";
      rename.style.cursor = "pointer";
      rename.title = "Rename bookmark";

      rename.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = b.label;
        input.style.width = "140px";
        input.style.fontSize = "13px";

        // Stop youtube keybindings when typing
        input.addEventListener("keydown", (e) => e.stopPropagation());
        input.addEventListener("keyup", (e) => e.stopPropagation());

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const newLabel = input.value.trim();
            if (newLabel) {
              const storageKey = getStorageKey();
              chrome.storage.local.get([storageKey], (result) => {
                const updated = result[storageKey] || [];
                updated[index].label = newLabel;
                chrome.storage.local.set({ [storageKey]: updated }, () => {
                  renderBookmarks(updated, panel);
                });
              });
            }
          }
        });

        left.replaceChild(input, label);
        input.focus();
      });

      left.appendChild(label);
      left.appendChild(rename);

      // Delete
      const del = document.createElement("span");
      del.textContent = "❌";
      del.style.cursor = "pointer";
      del.title = "Delete bookmark";

      del.addEventListener("click", () => {
        const storageKey = getStorageKey();
        chrome.storage.local.get([storageKey], (result) => {
          const updated = result[storageKey] || [];
          updated.splice(index, 1);
          chrome.storage.local.set({ [storageKey]: updated }, () => {
            renderBookmarks(updated, panel);
          });
        });
      });

      item.appendChild(left);
      item.appendChild(del);
      panel.appendChild(item);
    });
  }

  // Helper to get current storage key
  function getStorageKey() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    return `yt-bookmarks-${videoId}`;
  }

  // Main setup -----------------------------------------------------------------------------------
  function init() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    lastVideoId = videoId;
    const storageKey = getStorageKey();

    const controls = document.querySelector(".ytp-right-controls");
    if (!controls || document.querySelector(".ytp-bookmark-button")) return;

    const button = document.createElement("button");
    button.className = "ytp-button ytp-bookmark-button";
    button.title = "Open bookmarks";

    // Styles to match youtubes buttons
    button.style.width = "48px";
    button.style.height = "48px";
    button.style.margin = "0 4px"; 
    button.style.background = "none";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.display = "inline-flex"; 
    button.style.alignItems = "center"; 
    button.style.justifyContent = "center"; 

    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    // Make sure to match youtube icons 
    svg.setAttribute("width", "36"); 
    svg.setAttribute("height", "36");
    svg.setAttribute("viewBox", "0 0 36 36");
    svg.setAttribute("fill", "white");
    svg.setAttribute("aria-hidden", "true");

    // Creates the bookmark shape
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M6 2v20l6-4 6 4V2H6z"); 
    svg.appendChild(path);

    button.appendChild(svg);
    controls.appendChild(button);

    panel = document.createElement("div");
    panel.id = "yt-bookmark-panel";
    panel.style.position = "absolute";
    panel.style.top = "60px";
    panel.style.right = "20px";
    panel.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    panel.style.color = "white";
    panel.style.padding = "10px";
    panel.style.borderRadius = "8px";
    panel.style.zIndex = "9999";
    panel.style.maxWidth = "250px";
    panel.style.display = "none";
    panel.innerHTML = "<strong>Bookmarks</strong><br><em>Loading...</em>";
    document.body.appendChild(panel);

    chrome.storage.local.get([storageKey], (result) => {
      const bookmarks = result[storageKey] || [];
      renderBookmarks(bookmarks, panel);
    });

    button.addEventListener("click", () => {
      panelVisible = !panelVisible;
      panel.style.display = panelVisible ? "block" : "none";

      if (panelVisible) {
        chrome.storage.local.get([storageKey], (result) => {
          const bookmarks = result[storageKey] || [];
          renderBookmarks(bookmarks, panel);
        });
      }
    });
  }

  // Re-run init when video changes
  const observer = new MutationObserver(() => {
    const newVideoId = new URLSearchParams(window.location.search).get("v");
  
    // Not on video page - close panel if it was open 
    if (!newVideoId && panel && panelVisible) {
      panel.style.display = "none";
      panelVisible = false;
      return;
    }
  
    // Navigated to a different video
    if (newVideoId && newVideoId !== lastVideoId) {
      lastVideoId = newVideoId;
  
      if (panel) {
        panel.remove();
        panelVisible = false;
      }
  
      const oldButton = document.querySelector(".ytp-bookmark-button");
      if (oldButton) oldButton.remove();
  
      init();
    }
  });
  
  
  waitForBody(() => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
  
  waitForPlayerControls(() => {
    init();
  });
})();
