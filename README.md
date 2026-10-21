# ResearchMate 

### Your Smart Companion for Academic Research

ResearchMate is a web-based academic research workspace designed to help students and researchers organize research projects, manage academic papers, build citations, track progress, and explore research topics in one place.

The project aims to make academic research more organized, efficient, and accessible through an intuitive interface and a collection of research-focused tools.

##  Key Features

### Core Workspace
- **Dashboard** — An overview of research activities and workspace information.
- **Project Management** — Organize research projects and track their progress.
- **Paper Library** — Manage academic papers and research materials.
- **Research Notes** — Record and organize research notes.
- **Citation Management** — Generate and copy citations in APA, IEEE, and MLA formats.
- **AI Tools Interface** — Dedicated interface for paper summarization, keyword extraction, and topic exploration.

### Research Studio
ResearchMate also includes interfaces for eight additional research-focused features:

1. **Research Progress Tracker** — Track milestones and research progress.
2. **Paper Comparison Studio** — Compare research papers, methods, findings, and limitations.
3. **Ask Your Papers** — An interface for asking questions about research papers.
4. **Literature Review Matrix** — Organize and compare information from multiple studies.
5. **Smart Citation Builder** — Create formatted academic citations.
6. **Research Workflow Board** — Organize research tasks by status and priority.
7. **Research Timeline & Reminders** — Manage milestones, deadlines, and research schedules.
8. **Topic Explorer & Research Gap Finder** — Explore related topics and record potential research questions.

*Note: Some advanced AI and research-analysis features currently provide frontend demonstrations or user-driven workflows. Full AI-powered analysis depends on future backend/API integration.*

##  Design & User Experience

ResearchMate offers three visual themes:

- **Dark Futuristic** — A modern dark interface.
- **Light Premium** — A clean, light interface.
- **Hybrid** — A balanced combination of light and dark visual elements.

Additional interface goals include responsive layouts, interactive components, visual feedback, and balanced animations.

##  Technology Stack

**Current frontend**
- HTML5
- CSS3
- JavaScript
- Bootstrap (where used)

**Planned integration**
- Python backend and REST APIs
- Database integration
- AI/NLP-powered research tools

The backend and AI components are separate development areas and should not be considered fully implemented unless their corresponding code and integrations are available in the repository.

##  Project Structure

```text
ResearchMate/
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── dashboard.html
│   ├── projects.html
│   ├── papers.html
│   ├── notes.html
│   ├── citations.html
│   ├── ai-tools.html
│   ├── profile.html
│   ├── research-studio.html
│   ├── style.css
│   ├── theme.js
│   └── ...
├── backend/
│   └── README.md
├── docs/
│   └── README.md
└── README.md
```

##  Getting Started

### Prerequisites

- A modern web browser
- Visual Studio Code (recommended)
- The Live Server extension for Visual Studio Code (recommended)

### Run the Frontend

1. Clone the repository:

   ```bash
   git clone https://github.com/Taiyab2002/ResearchMate.git
   ```

2. Open the project folder in Visual Studio Code:

   ```bash
   cd ResearchMate
   code .
   ```

3. Open the `frontend` folder.
4. Launch `index.html` using Live Server, or use another local web server to serve the frontend files.
5. Explore the available pages and switch between the three visual themes.

**Note:** Some features use browser-local storage for demonstration purposes. Data stored this way is not automatically synchronized across devices or users.

##  Development Roadmap

- [x] Develop the core frontend pages.
- [x] Add three selectable visual themes.
- [x] Build the initial Research Studio feature interfaces.
- [x] Establish the GitHub project repository.
- [ ] Complete frontend functionality and responsive testing.
- [ ] Implement and integrate backend APIs.
- [ ] Connect persistent database storage.
- [ ] Integrate AI-powered research functionality.
- [ ] Perform end-to-end testing and deployment.

##  Project Objective

The goal of ResearchMate is to provide a unified research workspace that helps users manage academic projects, organize literature, create citations, monitor progress, and access intelligent research assistance as the platform evolves.

##  Contributors

ResearchMate is being developed as a university Project 300 project by:

- **Jarin Akther Salvi**
- **MD. Taiyab Ur Rahman**


##  License

No license has been specified yet. Unless a license is added, the repository should not be assumed to grant permission for unrestricted reuse or redistribution.
