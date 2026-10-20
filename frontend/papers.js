
const papersGrid = document.getElementById("papersGrid");
const paperForm = document.getElementById("paperForm");
const uploadModal = document.getElementById("uploadModal");
const detailsModal = document.getElementById("paperDetailsModal");

const searchInput = document.getElementById("paperSearch");
const yearFilter = document.getElementById("yearFilter");
const bookmarkFilter = document.getElementById("bookmarkFilter");
const emptyMessage = document.getElementById("emptyPapers");

const paperFileInput = document.getElementById("paperFile");

let nextPaperId = 5;

// Demo data: these are examples, not verified publications.
const papers = [
    {
        id: 1,
        title: "Artificial Intelligence in Education: A Review",
        authors: "Chen, L.; Chen, P.; Lin, Z.",
        year: 2024,
        journal: "IEEE Access (demo reference)",
        keywords: ["Artificial Intelligence", "Education", "Review"],
        project: "AI in Education",
        fileName: "",
        bookmarked: true
    },
    {
        id: 2,
        title: "Machine Learning Approaches for Student Performance Prediction",
        authors: "Khan, M.; Rahman, A.",
        year: 2023,
        journal: "Educational Data Mining (demo reference)",
        keywords: ["Machine Learning", "Prediction", "Students"],
        project: "Machine Learning Research",
        fileName: "student-performance-demo.pdf",
        bookmarked: true
    },
    {
        id: 3,
        title: "A Survey of Natural Language Processing Techniques",
        authors: "Ahmed, S.; Das, R.",
        year: 2022,
        journal: "NLP Research (demo reference)",
        keywords: ["NLP", "Text Processing", "Survey"],
        project: "",
        fileName: "",
        bookmarked: false
    },
    {
        id: 4,
        title: "Data Mining Methods for Academic Research",
        authors: "Islam, T.; Roy, N.",
        year: 2025,
        journal: "Research Methods (demo reference)",
        keywords: ["Data Mining", "Research", "Analytics"],
        project: "Literature Review",
        fileName: "data-mining-demo.pdf",
        bookmarked: false
    }
];

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function openModal(modal) {
    modal.hidden = false;
}

function closeModal(modal) {
    modal.hidden = true;
}

document.getElementById("openUploadModal").addEventListener(
    "click",
    function () {
        openModal(uploadModal);
        document.getElementById("paperTitle").focus();
    }
);

document.getElementById("closeUploadModal").addEventListener(
    "click",
    function () {
        closeModal(uploadModal);
    }
);

document.getElementById("cancelUpload").addEventListener(
    "click",
    function () {
        closeModal(uploadModal);
    }
);

document.getElementById("closePaperDetails").addEventListener(
    "click",
    function () {
        closeModal(detailsModal);
    }
);

document.getElementById("closePaperDetailsButton").addEventListener(
    "click",
    function () {
        closeModal(detailsModal);
    }
);

[uploadModal, detailsModal].forEach(function (modal) {
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeModal(uploadModal);
        closeModal(detailsModal);
    }
});

// Populate year options from the demo data.
function populateYearFilter() {
    const years = [...new Set(papers.map(function (paper) {
        return paper.year;
    }))].sort(function (a, b) {
        return b - a;
    });

    years.forEach(function (year) {
        const option = createElement("option", "", String(year));
        option.value = String(year);
        yearFilter.appendChild(option);
    });
}

function renderPapers() {
    papersGrid.replaceChildren();

    const query = searchInput.value.trim().toLowerCase();
    const selectedYear = yearFilter.value;
    const onlyBookmarked = bookmarkFilter.value === "bookmarked";

    const filteredPapers = papers.filter(function (paper) {
        const searchableText = [
            paper.title,
            paper.authors,
            paper.journal,
            paper.project,
            paper.year,
            ...paper.keywords
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(query);
        const matchesYear =
            selectedYear === "all" ||
            String(paper.year) === selectedYear;

        const matchesBookmark =
            !onlyBookmarked || paper.bookmarked;

        return matchesSearch && matchesYear && matchesBookmark;
    });

    filteredPapers.forEach(function (paper) {
        papersGrid.appendChild(createPaperCard(paper));
    });

    emptyMessage.hidden = filteredPapers.length !== 0;

    document.getElementById("paperResultCount").textContent =
        filteredPapers.length +
        (filteredPapers.length === 1 ? " paper" : " papers");

    updateStatistics();
}

function createPaperCard(paper) {
    const card = createElement("article", "paper-card");

    const top = createElement("div", "paper-card-top");
    const typeIcon = createElement("div", "paper-type-icon", "PDF");

    const bookmarkButton = createElement(
        "button",
        "paper-bookmark" + (paper.bookmarked ? " is-bookmarked" : ""),
        paper.bookmarked ? "★" : "☆"
    );

    bookmarkButton.type = "button";
    bookmarkButton.setAttribute(
        "aria-label",
        paper.bookmarked ? "Remove bookmark" : "Bookmark paper"
    );
    bookmarkButton.setAttribute(
        "aria-pressed",
        String(paper.bookmarked)
    );
    bookmarkButton.title = paper.bookmarked
        ? "Remove bookmark"
        : "Add bookmark";

    bookmarkButton.addEventListener("click", function () {
        paper.bookmarked = !paper.bookmarked;
        renderPapers();
    });

    top.append(typeIcon, bookmarkButton);

    const title = createElement("h3", "", paper.title);
    const authors = createElement("p", "paper-authors", paper.authors);
    const publication = createElement(
        "p",
        "paper-publication",
        paper.year + (paper.journal ? " · " + paper.journal : "")
    );

    const tags = createElement("div", "paper-tags");

    paper.keywords.forEach(function (keyword) {
        tags.appendChild(createElement("span", "paper-tag", keyword));
    });

    const footer = createElement("div", "paper-card-footer");

    const fileLabel = createElement(
        "span",
        "paper-file-label",
        paper.fileName ? "PDF: " + paper.fileName : "No PDF selected"
    );

    const detailsButton = createElement(
        "button",
        "paper-details-button",
        "View details →"
    );

    detailsButton.type = "button";
    detailsButton.addEventListener("click", function () {
        showPaperDetails(paper);
    });

    footer.append(fileLabel, detailsButton);
    card.append(top, title, authors, publication, tags, footer);

    return card;
}

function updateStatistics() {
    document.getElementById("totalPapers").textContent = papers.length;

    document.getElementById("bookmarkedPapers").textContent =
        papers.filter(function (paper) {
            return paper.bookmarked;
        }).length;

    document.getElementById("pdfPapers").textContent =
        papers.filter(function (paper) {
            return Boolean(paper.fileName);
        }).length;
}

function showPaperDetails(paper) {
    const title = document.getElementById("paperDetailsTitle");
    const content = document.getElementById("paperDetailsContent");

    title.textContent = paper.title;
    content.replaceChildren();

    const details = [
        ["Authors", paper.authors],
        ["Publication Year", String(paper.year)],
        ["Journal / Conference", paper.journal || "Not provided"],
        ["Research Project", paper.project || "Not linked to a project"],
        ["Keywords", paper.keywords.join(", ") || "None"],
        ["PDF", paper.fileName || "No PDF selected"],
        ["Bookmark", paper.bookmarked ? "Bookmarked" : "Not bookmarked"]
    ];

    details.forEach(function (item) {
        const row = createElement("div", "paper-detail-row");
        const heading = createElement("h3", "", item[0]);
        const value = createElement("p", "", item[1]);

        row.append(heading, value);
        content.appendChild(row);
    });

    openModal(detailsModal);
}

paperForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = document.getElementById("paperTitle").value.trim();
    const authors = document.getElementById("paperAuthors").value.trim();
    const yearValue = document.getElementById("paperYear").value;
    const journal = document.getElementById("paperJournal").value.trim();

    const keywordsValue =
        document.getElementById("paperKeywords").value.trim();

    const project = document.getElementById("paperProject").value.trim();
    const file = paperFileInput.files[0] || null;
    const year = Number(yearValue);
    const currentYear = new Date().getFullYear();

    if (!title || !authors || !yearValue) {
        alert("Please fill in the required fields.");
        return;
    }

    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
        alert("Please enter a valid publication year.");
        return;
    }

    if (file && file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")) {
        alert("Please select a PDF file.");
        return;
    }

    const duplicate = papers.some(function (paper) {
        return paper.title.toLowerCase() === title.toLowerCase();
    });

    if (duplicate) {
        alert("A paper with this title already exists in the demo library.");
        return;
    }

    const keywords = keywordsValue
        ? keywordsValue.split(",").map(function (keyword) {
            return keyword.trim();
        }).filter(Boolean)
        : [];

    papers.unshift({
        id: nextPaperId++,
        title: title,
        authors: authors,
        year: year,
        journal: journal,
        keywords: keywords,
        project: project,
        fileName: file ? file.name : "",
        bookmarked: false
    });

    paperForm.reset();
    closeModal(uploadModal);

    refreshYearFilter();
    renderPapers();

    alert(
        "Paper added to the demo library!\n\n" +
        "Note: the paper information and PDF are not uploaded to a server."
    );
});

function refreshYearFilter() {
    const selectedYear = yearFilter.value;

    yearFilter.replaceChildren();

    const allOption = createElement("option", "", "All Years");
    allOption.value = "all";
    yearFilter.appendChild(allOption);

    const years = [...new Set(papers.map(function (paper) {
        return paper.year;
    }))].sort(function (a, b) {
        return b - a;
    });

    years.forEach(function (year) {
        const option = createElement("option", "", String(year));
        option.value = String(year);
        yearFilter.appendChild(option);
    });

    yearFilter.value = years.includes(Number(selectedYear))
        ? selectedYear
        : "all";
}

searchInput.addEventListener("input", renderPapers);
yearFilter.addEventListener("change", renderPapers);
bookmarkFilter.addEventListener("change", renderPapers);

populateYearFilter();
renderPapers();
