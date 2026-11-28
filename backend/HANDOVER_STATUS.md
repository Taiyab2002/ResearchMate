# ResearchMate Backend Handover Status

Prepared from the supplied Backend Requirements PDF and the updated backend source ZIP.

## Completed in this handover build

- Preserved the existing Register, Login, JWT refresh, Profile, Projects, Papers, and Notes endpoint paths.
- Extended profile fields: student ID, study level, bio, email notification flag, research tips flag. Email is read-only from the account.
- Added refresh token rotation/blacklisting and authenticated logout endpoint.
- Added owner-scoped Citation CRUD with basic APA/MLA/IEEE rendering and metadata validation.
- Added project-linked milestone CRUD and automatic project progress calculation.
- Added owner-scoped research conversation/message storage and Ask Your Papers excerpt retrieval.
- Added Literature Review Matrix CRUD.
- Added Research Workflow Task CRUD and project filter.
- Added Research Event/Reminder CRUD.
- Added PDF upload validation (extension, size, PDF header), file storage, extraction status, and authenticated owner-only download/delete. Optional OCRmyPDF/Tesseract processing is wired for scanned PDFs when enabled on the host.
- Added summarization, keyword, topic suggestion, and topic-gap endpoints with baseline behavior and configurable OpenAI-compatible provider support when AI_API_KEY/AI_MODEL are configured.
- Added endpoint documentation, setup instructions, environment variable names, and migration instructions.
- Added a reminder delivery management command with email preference filtering, sent timestamp tracking, and dry-run mode.
- Added a new projects migration and API tests.

## Verification in this final pass

- Python syntax compilation (`python -m compileall -q projects config`): passed.
- The new reminder command, configurable AI provider, optional OCR path, and migration were inspected and included.
- Django `check`, migrations, and API tests could not be re-run in the packaging sandbox because Django is not installed there and package installation is blocked by network/DNS. Run the commands below on the project machine after installing `requirements.txt`.

## Remaining / environment-dependent

- AI provider is implemented as an optional OpenAI-compatible integration, but the team must supply `AI_API_KEY` and `AI_MODEL` (and `AI_API_BASE_URL` if using another compatible endpoint). Without credentials the baseline methods remain active.
- OCR is wired through OCRmyPDF, but requires OCRmyPDF and Tesseract installed on the host plus `OCR_ENABLED=True`.
- Reminder email delivery is implemented, but real delivery requires SMTP credentials and a scheduled invocation of `python manage.py send_research_reminders`. The default local email backend prints messages to the server console.
- Saved Paper Comparison sets are optional in the requirements; the frontend can compare selected metadata without persistence.
- Frontend integration/QA and GitHub push remain team tasks.
- Production database, private production file storage, HTTPS, production secrets, and deployment hardening remain before public deployment.
- The browser refresh issue observed during integration was caused by the frontend storage containing a `refresh` key with a null value. Backend login/refresh contracts remain standard SimpleJWT; frontend must store the actual `refresh` response string and replace it after token rotation.

## Final local verification commands

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py test projects
python manage.py send_research_reminders --dry-run
```

## Teammate's frontend integration checklist

1. Keep existing API base URL and existing endpoint names.
2. Send profile fields by the exact names: `student_id`, `study_level`, `bio`, `email_notifications`, `research_tips`.
3. For logout, POST `/api/logout/` with the stored refresh token; clear both local tokens after successful logout or 401.
4. For PDF upload, send multipart form-data with `file` and optional `project`/`paper`; response includes `download_url`. Fetch the download URL with Bearer auth and save/open the returned blob; it is not a public static media URL.
5. For Ask Your Papers, create a conversation, attach selected owned paper IDs using `paper_ids`, then POST `/api/conversations/{id}/ask/` with `{ "question": "..." }`.
6. Milestone progress is calculated from completed milestones; avoid relying on a separate manually edited progress value once milestones are used.
7. Treat AI endpoint `method` and `notice` fields as important: without provider credentials results are extractive/heuristic; provider outputs and gap ideas still must not be displayed as verified research claims.
8. Test registration/login, account switching, create/update/delete for each page, refresh persistence, PDF upload/download, and cross-user isolation in the browser.
