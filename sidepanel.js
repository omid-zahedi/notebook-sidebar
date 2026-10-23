document.addEventListener("DOMContentLoaded", () => {
  const DB_NAME = "NotebookDB";
  const STORE_NAME = "notes";
  const DB_VERSION = 1;
  let db = null;

  const initDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("pinned", "pinned", { unique: false });
        }
      };
    });
  };

  const addNote = async (note) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.add(note);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getAllNotes = async () => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const updateNoteDB = async (note) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const deleteNoteDB = async (id) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const clearAllNotes = async () => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const ensurePx = (height) => {
    if (!height) return "74px";
    if (typeof height === "number") return `${height}px`;
    return `${parseInt(height) || 74}px`;
  };

  const detectLanguageAndSetDirection = (textarea) => {
    if (selectedAlign) return;
    const value = textarea.value.trim();
    if (/^[\u0600-\u06FF]/.test(value)) {
      textarea.style.direction = "rtl";
      textarea.style.textAlign = "right";
    } else {
      textarea.style.direction = "ltr";
      textarea.style.textAlign = "left";
    }
  };

  const addDirectionDetection = (textarea) => {
    textarea.addEventListener("input", () => detectLanguageAndSetDirection(textarea));
  };

  const generateUniqueId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 604800);
    if (interval >= 1) return `${interval} week${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  };

  const getNoteDate = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  const searchBarPortrait = document.getElementById("searchBarPortrait");
  const searchBarLandscape = document.getElementById("searchBarLandscape");
  const noteTextArea = document.getElementById("noteTextArea");
  const saveNoteButton = document.getElementById("saveNoteButton");
  const saveNoteButtonLandscape = document.getElementById("saveNoteButtonLandscape");
  const notesList = document.getElementById("notesList");
  const exportAllButton = document.getElementById("exportAllButton");
  const importButton = document.getElementById("importButton");
  const importFileInput = document.getElementById("importFileInput");
  const themeToggle = document.getElementById("themeToggle");
  const themeStylesheet = document.getElementById("theme-stylesheet");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");
  const alignButtons = document.querySelectorAll('.align-btn');
  const cutAllBtn = document.getElementById('cutAllBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');

  let selectedAlign = localStorage.getItem('selectedAlign') || null;

  const applyAlignment = (align) => {
    if (!align) return;
    noteTextArea.style.direction = align === 'right' ? 'rtl' : 'ltr';
    noteTextArea.style.textAlign = align;
    alignButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === align);
    });
    selectedAlign = align;
    localStorage.setItem('selectedAlign', align);
  };

  const resetAlignment = () => {
    alignButtons.forEach(btn => btn.classList.remove('active'));
    selectedAlign = null;
    localStorage.removeItem('selectedAlign');
    detectLanguageAndSetDirection(noteTextArea);
  };

  if (selectedAlign) {
    applyAlignment(selectedAlign);
  } else {
    detectLanguageAndSetDirection(noteTextArea);
  }

  alignButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const align = btn.dataset.align;
      applyAlignment(align);
    });
  });

  cutAllBtn.addEventListener('click', () => {
    if (noteTextArea.value.trim()) {
      navigator.clipboard.writeText(noteTextArea.value).then(() => {
        noteTextArea.value = '';
        localStorage.removeItem('draftNote');
        resetAlignment();
      }).catch(err => {
        console.error("خطا در کات کردن:", err);
      });
    }
  });

  copyAllBtn.addEventListener('click', () => {
    if (noteTextArea.value.trim()) {
      navigator.clipboard.writeText(noteTextArea.value).then(() => {
        copyAllBtn.textContent = 'Copied!';
        setTimeout(() => copyAllBtn.textContent = 'Copy', 1500);
      }).catch(err => {
        console.error("خطا در کپی کردن:", err);
      });
    }
  });

  const updateThemeDisplay = (isDark) => {
    if (isDark) {
      themeText.textContent = "dark";
      themeIcon.src = "icons/moon.svg";
      themeToggle.checked = true;
    } else {
      themeText.textContent = "light";
      themeIcon.src = "icons/sun.svg";
      themeToggle.checked = false;
    }
  };

  const savedTheme = localStorage.getItem("theme") || "light";
  themeStylesheet.href = `${savedTheme}.css`;
  const isDark = savedTheme === "dark";
  updateThemeDisplay(isDark);

  themeToggle.addEventListener("change", () => {
    const newTheme = themeToggle.checked ? "dark" : "light";
    themeStylesheet.href = `${newTheme}.css`;
    localStorage.setItem("theme", newTheme);
    updateThemeDisplay(newTheme === "dark");
  });

  let inputTextAreaHeight = 100;
  const savedHeight = localStorage.getItem("inputTextAreaHeight");
  if (savedHeight) {
    inputTextAreaHeight = parseInt(savedHeight) || 100;
  }
  noteTextArea.style.height = ensurePx(inputTextAreaHeight);
  noteTextArea.value = localStorage.getItem("draftNote") || "";
  detectLanguageAndSetDirection(noteTextArea);

  noteTextArea.addEventListener("input", () => {
    localStorage.setItem("draftNote", noteTextArea.value);
    if (!selectedAlign) {
      detectLanguageAndSetDirection(noteTextArea);
    }
    if (!noteTextArea.value.trim()) {
      resetAlignment();
    }
  });

  noteTextArea.addEventListener(
    "mouseup",
    debounce(() => {
      const isLandscape = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
      if (!isLandscape) {
        inputTextAreaHeight = parseInt(noteTextArea.offsetHeight) || 100;
        localStorage.setItem("inputTextAreaHeight", inputTextAreaHeight);
      }
    }, 200)
  );

  const hideTimers = new Map();
  const HIDE_DELAY_MS = 20000;

  const hideButtonsImmediate = (buttonsContainer) => {
    buttonsContainer?.classList.remove("visible");
    const noteTextarea = buttonsContainer?.parentElement.querySelector("textarea");
    if (noteTextarea) noteTextarea.style.overflowY = "hidden";
  };

  const showButtonsImmediate = (buttonsContainer) => {
    buttonsContainer?.classList.add("visible");
    const noteTextarea = buttonsContainer?.parentElement.querySelector("textarea");
    if (noteTextarea) noteTextarea.style.overflowY = "auto";
  };

  const startHideTimer = (noteId, noteTextarea, buttonsContainer) => {
    clearHideTimer(noteId);
    if (!noteTextarea.readOnly) return;
    const t = setTimeout(() => {
      if (noteTextarea.readOnly) hideButtonsImmediate(buttonsContainer);
      hideTimers.delete(noteId);
    }, HIDE_DELAY_MS);
    hideTimers.set(noteId, t);
  };

  const clearHideTimer = (noteId) => {
    const t = hideTimers.get(noteId);
    if (t) clearTimeout(t);
    hideTimers.delete(noteId);
  };

  const hideAllButtonsExcept = (exceptLi) => {
    Array.from(notesList.querySelectorAll("li")).forEach((li) => {
      if (li !== exceptLi) {
        hideButtonsImmediate(li.querySelector(".buttons-container"));
        const ta = li.querySelector("textarea");
        if (ta?.dataset.noteId) clearHideTimer(ta.dataset.noteId);
      }
    });
  };

  const saveHeight = async (noteId, height) => {
    try {
      const validHeight = parseInt(height) || 74;
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const note = await new Promise((resolve, reject) => {
        const request = store.get(noteId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (note) {
        note.height = validHeight;
        await updateNoteDB(note);
      }
    } catch (error) {
      console.error("Error saving height:", error);
    }
  };

  const loadNotes = async (activeNoteId = null) => {
    try {
      notesList.innerHTML = "";
      const notes = await getAllNotes();
      if (notes.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "notes list empty !";
        msg.style.color = "gray";
        msg.style.textAlign = "center";
        msg.style.marginTop = "20px";
        msg.style.fontSize = "15px";
        notesList.appendChild(msg);
        return;
      }
      notes
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned - a.pinned;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .forEach((note) => {
          const li = document.createElement("li");
          if (note.pinned) li.style.border = "3px solid rgb(74 169 226 / 51%)";

          const noteTextArea = document.createElement("textarea");
          noteTextArea.value = note.content;
          noteTextArea.readOnly = true;
          noteTextArea.dataset.noteId = note.id;
          noteTextArea.style.height = ensurePx(note.height || 74);
          detectLanguageAndSetDirection(noteTextArea);
          addDirectionDetection(noteTextArea);
          noteTextArea.addEventListener(
            "mouseup",
            debounce(() => {
              if (!noteTextArea.readOnly) {
                const isLandscape = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
                if (!isLandscape) saveHeight(note.id, noteTextArea.offsetHeight);
              }
            }, 200)
          );

          const buttonsContainer = document.createElement("div");
          buttonsContainer.className = "buttons-container";

          const timeContainer = document.createElement("div");
          timeContainer.className = "time-container";
          const timeAgoEl = document.createElement("span");
          timeAgoEl.className = "time-ago";
          timeAgoEl.textContent = getTimeAgo(note.createdAt);
          const dateEl = document.createElement("span");
          dateEl.className = "note-date";
          dateEl.textContent = getNoteDate(note.createdAt);
          timeContainer.appendChild(timeAgoEl);
          timeContainer.appendChild(dateEl);

          const editButton = document.createElement("button");
          editButton.innerHTML = '<img src="icons/edit.svg" alt="Edit">';
          const deleteButton = document.createElement("button");
          deleteButton.innerHTML = '<img src="icons/delete.svg" alt="Delete">';
          const copyButton = document.createElement("button");
          copyButton.innerHTML = '<img src="icons/copy.svg" alt="Copy">';
          const downloadButton = document.createElement("button");
          downloadButton.innerHTML = '<img src="icons/download.svg" alt="Download">';
          const pinButton = document.createElement("button");
          pinButton.innerHTML = note.pinned
            ? '<img src="icons/unpin.svg" alt="Unpin">'
            : '<img src="icons/pin.svg" alt="Pin">';

          // زمان در سمت راست (آخرین عنصر)
          buttonsContainer.append(editButton, deleteButton, copyButton, downloadButton, pinButton, timeContainer);

          li.append(noteTextArea, buttonsContainer);
          notesList.appendChild(li);

          const showButtonsHandler = (e) => {
            e.stopPropagation();
            hideAllButtonsExcept(li);
            showButtonsImmediate(buttonsContainer);
            if (noteTextArea.readOnly) startHideTimer(note.id, noteTextArea, buttonsContainer);
            else clearHideTimer(note.id);
          };

          li.addEventListener("click", showButtonsHandler);
          noteTextArea.addEventListener("click", showButtonsHandler);

          const resetHideOnInteraction = () => {
            showButtonsImmediate(buttonsContainer);
            if (noteTextArea.readOnly) startHideTimer(note.id, noteTextArea, buttonsContainer);
            else clearHideTimer(note.id);
          };

          [deleteButton, copyButton, downloadButton].forEach((btn) =>
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              resetHideOnInteraction();
            })
          );

          editButton.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            if (noteTextArea.readOnly) {
              noteTextArea.readOnly = false;
              noteTextArea.focus();
              editButton.innerHTML = '<img src="icons/save.svg" alt="Save">';
              clearHideTimer(note.id);
            } else {
              noteTextArea.readOnly = true;
              await updateNote(note.id, noteTextArea.value);
              const isLandscape = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
              if (!isLandscape) {
                await saveHeight(note.id, noteTextArea.offsetHeight);
              }
              detectLanguageAndSetDirection(noteTextArea);
              editButton.innerHTML = '<img src="icons/edit.svg" alt="Edit">';
              startHideTimer(note.id, noteTextArea, buttonsContainer);
            }
          });

          deleteButton.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            await deleteNote(note.id);
          });

          copyButton.addEventListener("click", (ev) => {
            ev.stopPropagation();
            navigator.clipboard.writeText(noteTextArea.value).then(() => {
              copyButton.innerHTML = '<img src="icons/copied.svg" alt="Copied">';
              setTimeout(() => (copyButton.innerHTML = '<img src="icons/copy.svg" alt="Copy">'), 2000);
            });
          });

          downloadButton.addEventListener("click", (ev) => {
            ev.stopPropagation();
            try {
              downloadNote(noteTextArea.value, `note${Date.now()}.txt`);
              downloadButton.innerHTML = '<img src="icons/downloaded.svg" alt="Downloaded">';
              setTimeout(() => (downloadButton.innerHTML = '<img src="icons/download.svg" alt="Download">'), 1000);
            } catch (error) {
              console.error("Error in downloadNote:", error);
            }
          });

          pinButton.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            await togglePin(note.id);
            setTimeout(() => {
              const activeLi = [...notesList.querySelectorAll("li")].find(
                (li) => li.querySelector("textarea")?.dataset.noteId === note.id
              );
              if (activeLi) {
                const btns = activeLi.querySelector(".buttons-container");
                showButtonsImmediate(btns);
                startHideTimer(note.id, activeLi.querySelector("textarea"), btns);
              }
            }, 50);
          });

          if (activeNoteId === note.id) {
            showButtonsImmediate(buttonsContainer);
            startHideTimer(note.id, noteTextArea, buttonsContainer);
          } else {
            hideButtonsImmediate(buttonsContainer);
          }
        });
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  document.addEventListener("click", (event) => {
    const insideLi = event.target.closest("li");
    if (!insideLi) {
      Array.from(notesList.querySelectorAll("li")).forEach((li) => {
        hideButtonsImmediate(li.querySelector(".buttons-container"));
        const ta = li.querySelector("textarea");
        if (ta?.dataset.noteId) clearHideTimer(ta.dataset.noteId);
      });
    } else hideAllButtonsExcept(insideLi);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      try {
        const noteTextAreas = notesList.querySelectorAll("textarea");
        noteTextAreas.forEach(async (textarea) => {
          const noteId = textarea.dataset.noteId;
          const height = textarea.offsetHeight;
          if (noteId && height) {
            if (!window.matchMedia("(min-aspect-ratio: 1/1)").matches) {
              await saveHeight(noteId, height);
            }
          }
        });
      } catch (error) {
        console.error("Error saving note heights on visibility change:", error);
      }
    }
  });

  const saveNote = async () => {
    try {
      const noteText = noteTextArea.value.trim();
      if (!noteText) return;
      const newNote = {
        id: generateUniqueId(),
        content: noteText,
        pinned: false,
        height: 74,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addNote(newNote);
      const isLandscape = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
      if (!isLandscape) {
        inputTextAreaHeight = parseInt(noteTextArea.offsetHeight) || 100;
        localStorage.setItem("inputTextAreaHeight", inputTextAreaHeight);
      }
      noteTextArea.value = "";
      localStorage.removeItem("draftNote");
      resetAlignment();
      await loadNotes();
    } catch (error) {
      console.error("Error in saveNote:", error);
    }
  };

  const importNotes = async (content) => {
    try {
      const notes = content.split(/[-]{10,}/).map((n) => n.trim()).filter(Boolean);
      if (!notes.length) {
        alert("No valid notes found in the file!");
        return;
      }
      for (const text of notes) {
        const newNote = {
          id: generateUniqueId(),
          content: text,
          pinned: false,
          height: 74,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addNote(newNote);
      }
      await loadNotes();
    } catch (error) {
      console.error("Error in importNotes:", error);
      alert("Error importing notes. Please try again.");
    }
  };

  const updateNote = async (id, newValue) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const note = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (note) {
        note.content = newValue;
        note.updatedAt = new Date().toISOString();
        await updateNoteDB(note);
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const deleteNote = async (id) => {
    try {
      await deleteNoteDB(id);
      await loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const downloadNote = (content, filename) => {
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (error) {
      console.error("Error in downloadNote:", error);
    }
  };

  const togglePin = async (id) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const note = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (note) {
        note.pinned = !note.pinned;
        await updateNoteDB(note);
        await loadNotes(id);
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const filterNotes = () => {
    const val = (searchBarPortrait.value || searchBarLandscape.value).toLowerCase();
    let hasResults = false;
    const lis = Array.from(notesList.children).filter((i) => i.tagName === "LI");
    lis.forEach((li) => {
      const ta = li.querySelector("textarea");
      if (ta.value.toLowerCase().includes(val)) {
        li.style.display = "flex";
        hasResults = true;
      } else li.style.display = "none";
    });
    const msg = document.getElementById("noResultsMessage");
    msg?.remove();
    if (!hasResults && lis.length > 0) {
      const noMsg = document.createElement("div");
      noMsg.id = "noResultsMessage";
      noMsg.textContent = "text not found in search!";
      Object.assign(noMsg.style, {
        color: "gray",
        textAlign: "center",
        marginTop: "20px",
        fontSize: "15px"
      });
      notesList.appendChild(noMsg);
    }
  };

  saveNoteButton.addEventListener("click", saveNote);
  saveNoteButtonLandscape.addEventListener("click", saveNote);
  searchBarPortrait.addEventListener("input", filterNotes);
  searchBarLandscape.addEventListener("input", filterNotes);

  exportAllButton.addEventListener("click", async () => {
    try {
      const notes = await getAllNotes();
      if (!notes.length) {
        alert("No notes available to export!");
        return;
      }
      const content = notes.map((n) => n.content).join("\n\n--------------\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "all_notes.txt";
      link.click();
    } catch (error) {
      console.error("Error in export all notes:", error);
      alert("Error exporting notes. Please try again.");
    }
  });

  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => importNotes(ev.target.result);
      reader.onerror = () => {
        console.error("Error reading file");
        alert("Error reading file. Please try again.");
      };
      reader.readAsText(file);
    } else {
      alert("Please select a valid .txt file.");
    }
    e.target.value = "";
  });

  initDB().then(() => {
    loadNotes();
    console.log("Database initialized successfully");
  }).catch((error) => {
    console.error("Error initializing database:", error);
  });
});