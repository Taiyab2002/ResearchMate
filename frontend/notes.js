
const notesGrid = document.getElementById("notesGrid");
const noteForm = document.getElementById("noteForm");
const noteModal = document.getElementById("noteModal");
const noteDetailsModal = document.getElementById("noteDetailsModal");

const noteSearch = document.getElementById("noteSearch");
const noteTypeFilter = document.getElementById("noteTypeFilter");
const noteType = document.getElementById("noteType");

const paperLinkGroup = document.getElementById("paperLinkGroup");
const projectLinkGroup = document.getElementById("projectLinkGroup");
const notePaper = document.getElementById("notePaper");
const noteProject = document.getElementById("noteProject");

let nextNoteId = 5;
let editingNoteId = null;

// Demo data only. Replace with API data during backend integration.
const notes = [
    {
        id: 1,
        title: "Literature Review: Key Observations",
        content: "Compare the research objectives, datasets, methodologies, and limitations across the selected papers. Identify research gaps before finalizing the research direction.",
        type: "project",
        linkedItem: "AI in Education",
        updatedAt: "2026-10-12"
    },
    {
        id: 2,
        title: "Machine Learning Model Comparison",
        content: "Potential models to investigate include decision trees, random forests, and logistic regression. Compare them using suitable evaluation metrics. These are initial research ideas, not experimental findings.",
        type: "paper",
        linkedItem: "Machine Learning Approaches for Student Performance Prediction",
        updatedAt: "2026-10-13"
    },
    {
        id: 3,
        title: "Research Questions to Explore",
        content: "Which student-related features may be useful for prediction? How can a model be evaluated fairly? What privacy considerations apply when working with educational data?",
        type: "project",
        linkedItem: "AI-Based Student Performance Prediction",
        updatedAt: "2026-10-15"
    },
    {
        id: 4,
        title: "Notes on Natural Language Processing",
        content: "Review tokenization, text normalization, keyword extraction, and text summarization. Check which techniques are appropriate for the selected research papers.",
        type: "paper",
        linkedItem: "A Survey of Natural Language Processing Techniques",
        updatedAt: "2026-10-16"
    }
];

const demoPapers = [
    "Artificial Intelligence in Education: A Review",
    "Machine Learning Approaches for Student Performance Prediction",
    "A Survey of Natural Language Processing Techniques",
    "Data Mining Methods for Academic Research"
];

const demoProjects = [
    "AI in Education",
    "Machine Learning Research",
    "Text Summarization",
    "AI-Based Student Performance Prediction"
];

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function showModal(modal) {
    modal.hidden = false;
}

function hideModal(modal) {
    modal.hidden = true;
}

function populateOptions(select, items, placeholder) {
    select.replaceChildren();

    const firstOption = makeElement("option", "", placeholder);
    firstOption.value = "";
    select.appendChild(firstOption);

    items.forEach(function (item) {
        const option = makeElement("option", "", item);
        option.value = item;
        select.appendChild(option);
    });
}

populateOptions(notePaper, demoPapers, "Choose a paper");
populateOptions(noteProject, demoProjects, "Choose a project");

function updateLinkFields() {
    const type = noteType.value;

    paperLinkGroup.hidden = type !== "paper";
    projectLinkGroup.hidden = type !== "project";

    notePaper.required = type === "paper";
    noteProject.required = type === "project";
}

noteType.addEventListener("change", updateLinkFields);

function openCreateNote() {
    editingNoteId = null;
    noteForm.reset();

    document.getElementById("noteModalTitle").textContent =
        "Create Research Note";

    document.getElementById("saveNoteButton").textContent = "Save Note";

    updateLinkFields();
    showModal(noteModal);
    document.getElementById("noteTitle").focus();
}

document.getElementById("addNoteButton").addEventListener(
    "click",
    openCreateNote
);

document.getElementById("closeNoteModal").addEventListener(
    "click",
    function () {
        hideModal(noteModal);
    }
);

document.getElementById("cancelNote").addEventListener(
    "click",
    function () {
        hideModal(noteModal);
    }
);

document.getElementById("closeNoteDetails").addEventListener(
    "click",
    function () {
        hideModal(noteDetailsModal);
    }
);

document.getElementById("closeNoteDetailsButton").addEventListener(
    "click",
    function () {
        hideModal(noteDetailsModal);
    }
);

[noteModal, noteDetailsModal].forEach(function (modal) {
    modal.addEventListener("click", function (event) {
        if (event.target === modal) hideModal(modal);
    });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        hideModal(noteModal);
        hideModal(noteDetailsModal);
    }
});

function formatDate(dateString) {
    if (!dateString) return "Not available";

    const date = new Date(dateString + "T12:00:00");

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function getTypeLabel(type) {
    if (type === "paper") return "Paper Note";
    if (type === "project") return "Project Note";
    return "General Note";
}

function renderNotes() {
    notesGrid.replaceChildren();

    const query = noteSearch.value.trim().toLowerCase();
    const selectedType = noteTypeFilter.value;

    const filteredNotes = notes.filter(function (note) {
        const text = [
            note.title,
            note.content,
            note.linkedItem,
            getTypeLabel(note.type)
        ].join(" ").toLowerCase();

        const matchesSearch = text.includes(query);
        const matchesType =
            selectedType === "all" || note.type === selectedType;

        return matchesSearch && matchesType;
    });

    filteredNotes.forEach(function (note) {
        notesGrid.appendChild(createNoteCard(note));
    });

    document.getElementById("emptyNotes").hidden =
        filteredNotes.length > 0;

    document.getElementById("noteResultCount").textContent =
        filteredNotes.length +
        (filteredNotes.length === 1 ? " note" : " notes");

    updateStatistics();
}

function createNoteCard(note) {
    const card = makeElement("article", "note-card");

    const top = makeElement("div", "note-card-top");

    const badge = makeElement(
        "span",
        "note-type-badge " + note.type,
        getTypeLabel(note.type)
    );

    const date = makeElement(
        "span",
        "note-date",
        formatDate(note.updatedAt)
    );

    top.append(badge, date);

    const title = makeElement("h3", "", note.title);
    const preview = makeElement("p", "note-preview", note.content);

    const linkedItem = makeElement(
        "p",
        "note-linked-item",
        note.linkedItem
            ? "Linked to: " + note.linkedItem
            : "Not linked to a paper or project"
    );

    const footer = makeElement("div", "note-card-footer");

    const viewButton = makeElement(
        "button", "note-action primary", "View"
    );
    viewButton.type = "button";
    viewButton.addEventListener("click", function () {
        viewNote(note);
    });

    const editButton = makeElement(
        "button", "note-action", "Edit"
    );
    editButton.type = "button";
    editButton.addEventListener("click", function () {
        editNote(note);
    });

    const deleteButton = makeElement(
        "button", "note-action delete", "Delete"
    );
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        deleteNote(note.id);
    });

    footer.append(viewButton, editButton, deleteButton);
    card.append(top, title, preview, linkedItem, footer);

    return card;
}

function updateStatistics() {
    document.getElementById("totalNotes").textContent = notes.length;

    document.getElementById("paperNotesCount").textContent =
        notes.filter(function (note) {
            return note.type === "paper";
        }).length;

    document.getElementById("projectNotesCount").textContent =
        notes.filter(function (note) {
            return note.type === "project";
        }).length;
}

function viewNote(note) {
    document.getElementById("noteDetailsTitle").textContent = note.title;

    document.getElementById("noteDetailsMeta").textContent =
        getTypeLabel(note.type) +
        " · " +
        (note.linkedItem || "No linked item") +
        " · Updated " +
        formatDate(note.updatedAt);

    // textContent prevents note text from being interpreted as HTML.
    document.getElementById("noteDetailsContent").textContent =
        note.content;

    showModal(noteDetailsModal);
}

function editNote(note) {
    editingNoteId = note.id;

    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").value = note.content;
    noteType.value = note.type;

    updateLinkFields();

    notePaper.value = note.type === "paper" ? note.linkedItem : "";
    noteProject.value = note.type === "project" ? note.linkedItem : "";

    document.getElementById("noteModalTitle").textContent = "Edit Research Note";
    document.getElementById("saveNoteButton").textContent = "Update Note";

    showModal(noteModal);
}

function deleteNote(id) {
    const note = notes.find(function (item) {
        return item.id === id;
    });

    if (!note) return;

    const confirmed = confirm(
        'Are you sure you want to delete "' + note.title + '"?'
    );

    if (!confirmed) return;

    const index = notes.findIndex(function (item) {
        return item.id === id;
    });

    if (index !== -1) {
        notes.splice(index, 1);
        renderNotes();
    }
}

noteForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();
    const type = noteType.value;

    if (!title || !content) {
        alert("Please enter both a note title and content.");
        return;
    }

    let linkedItem = "";

    if (type === "paper") {
        linkedItem = notePaper.value;

        if (!linkedItem) {
            alert("Please select a research paper.");
            return;
        }
    } else if (type === "project") {
        linkedItem = noteProject.value;

        if (!linkedItem) {
            alert("Please select a research project.");
            return;
        }
    }

    const today = new Date().toISOString().slice(0, 10);

    if (editingNoteId !== null) {
        const existingNote = notes.find(function (note) {
            return note.id === editingNoteId;
        });

        if (!existingNote) return;

        existingNote.title = title;
        existingNote.content = content;
        existingNote.type = type;
        existingNote.linkedItem = linkedItem;
        existingNote.updatedAt = today;
    } else {
        notes.unshift({
            id: nextNoteId++,
            title: title,
            content: content,
            type: type,
            linkedItem: linkedItem,
            updatedAt: today
        });
    }

    hideModal(noteModal);
    noteForm.reset();
    editingNoteId = null;

    updateLinkFields();
    renderNotes();
});

noteSearch.addEventListener("input", renderNotes);
noteTypeFilter.addEventListener("change", renderNotes);

updateLinkFields();
renderNotes();
