# ResearchMate API Endpoint Handover

Base URL: `http://127.0.0.1:8000/api/`
All endpoints below require `Authorization: Bearer <access>` except Register and Login. JSON errors are returned by DRF; validation failures generally use HTTP 400, unauthenticated requests 401, and missing/foreign-owned records 404.

## Existing endpoints preserved

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/register/` | Register; accepts username, email, password, optional full_name/university/department |
| POST | `/login/` | JWT access + refresh |
| POST | `/token/refresh/` | Refresh access token; refresh rotation enabled |
| GET/PATCH | `/profile/` | Authenticated user's profile |
| GET/POST | `/projects/` | List/create owned projects |
| GET/PATCH/PUT/DELETE | `/projects/{id}/` | Project detail CRUD |
| GET/POST | `/papers/` | List/create papers attached to owned projects |
| GET/PATCH/PUT/DELETE | `/papers/{id}/` | Paper detail CRUD |
| GET/POST | `/notes/` | List/create owned notes |
| GET/PATCH/PUT/DELETE | `/notes/{id}/` | Note detail CRUD |

## Added authentication/profile

- `POST /logout/` with `{ "refresh": "<refresh token>" }` blacklists the refresh token.
- Profile adds `student_id`, `study_level`, `bio`, `email_notifications`, `research_tips`. Email is read-only/displayed from the Django user account. Existing fields remain.
- JWT access lifetime: 30 minutes; refresh lifetime: 7 days; rotation and blacklist after rotation enabled.

## Added persistent APIs

- `GET/POST /citations/`; `GET/PATCH/PUT/DELETE /citations/{id}/`. Citation text is generated server-side for APA/MLA/IEEE as a basic formatted reference. Source-specific validation covers article, book, website, and conference metadata; use `source_type` values such as `article`, `book`, `website`, or `conference`.
- `GET/POST /milestones/`; detail CRUD at `/milestones/{id}/`. Milestone records belong to a project. Project progress is automatically calculated as completed milestones / total milestones (rounded percent); no milestones means 0.
- `GET/POST /conversations/`; detail CRUD at `/conversations/{id}/`; `POST /conversations/{id}/ask/` stores user/assistant messages.
- `GET/POST /literature-matrix/`; detail CRUD at `/literature-matrix/{id}/`.
- `GET/POST /tasks/`; detail CRUD at `/tasks/{id}/`; optional `?project=<id>` filter.
- `GET/POST /events/`; detail CRUD at `/events/{id}/`. `reminder_sent_at` is server-managed and read-only.
- `GET/POST /uploads/`; detail CRUD at `/uploads/{id}/`. POST multipart form-data: `file` required, optional `project` and `paper`. Maximum PDF size 20 MB. Response includes an authenticated `download_url` at `/uploads/{id}/download/`; PDF bytes are not served from a public media URL. The frontend must fetch this URL with its Bearer token (e.g. blob download). Deleting the upload record deletes its stored file.
- `GET /health/` authenticated API health response.

## Research / AI endpoints

- `POST /ai/summarize/`: JSON `{ "text": "...", "length": "short|medium|long" }` or `{ "paper_id": <owned paper id> }`.
- `POST /ai/keywords/`: JSON `{ "text": "...", "count": 8 }` or owned `paper_id`.
- `POST /ai/topic-suggestions/`: JSON `{ "topic": "..." }`.
- `POST /ai/topic-gap/`: JSON `{ "topic": "...", "paper_context": "..." }`.

## Current implementation notes / limitations (important for frontend teammate)

1. AI provider integration is configurable for OpenAI-compatible chat-completions APIs. Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_API_BASE_URL`; when configured, summary, keywords, topic suggestions/gap exploration, and Ask Your Papers use the provider. Without credentials, clearly labeled extractive/heuristic baselines remain available.
2. Keyword extraction is frequency-based when no provider is configured.
3. Topic/gap suggestions are explicitly marked unverified; AI output is not a verified literature gap.
4. Ask Your Papers retrieves excerpts only from the authenticated user's selected owned papers and uses the configured provider to answer grounded in those excerpts. Without a provider it returns excerpt matching.
5. PDF text extraction uses `pypdf`. Optional OCR is wired through OCRmyPDF when `OCR_ENABLED=True`; OCRmyPDF and Tesseract must be installed on the host. Status values distinguish unavailable/failed OCR. The file download endpoint checks ownership and requires JWT authentication.
6. Reminder delivery is implemented as a management command: `python manage.py send_research_reminders`. It sends due upcoming events to users with email notifications enabled and a registered email, then records `reminder_sent_at`. Configure SMTP and schedule this command (e.g., Windows Task Scheduler or cron) for automated delivery. The command supports `--dry-run`.
7. Paper comparison can remain frontend-side using selected paper metadata; saving comparison sets was optional in the requirements.
8. Public deployment still needs production storage, environment secret, DEBUG=False, HTTPS/security configuration, and a production database.
