# ResearchMate Backend

Django REST Framework API for ResearchMate. Local API base: `http://127.0.0.1:8000/api/`.

## Setup (Windows PowerShell)

```powershell
cd "H:\Project 300\backendupdated\backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver 127.0.0.1:8000
```

If the folder already has an old `venv`, rename it to `venv_old` first and create a fresh one. Virtual environments are machine/path-specific and must not be committed or included in a handover ZIP.

## Environment variables

- `DJANGO_SECRET_KEY`: set a new long random secret before any public deployment. The built-in fallback is local-development-only.
- `DJANGO_DEBUG`: defaults to `True` for local development; set `False` for deployment.
- `DJANGO_ALLOWED_HOSTS`: comma-separated hosts; defaults to `localhost,127.0.0.1`.
- `AI_API_KEY`: provider key; leave unset to use the clearly labeled baseline algorithms.
- `AI_MODEL`: required model name when AI provider is configured.
- `AI_API_BASE_URL`: optional OpenAI-compatible `/chat/completions` endpoint; defaults to the OpenAI endpoint.
- `AI_REQUEST_TIMEOUT`: provider request timeout in seconds (default 45; capped at 120).
- `OCR_ENABLED`: set `True` to attempt OCR on image-only PDFs; install OCRmyPDF and Tesseract on the machine first.
- `DJANGO_EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`: configure SMTP for real reminder delivery.

Do not commit real secrets. Before deploying, configure the secret and allowed hosts securely. SQLite is configured for local development; use a managed production database before deployment.

## Migrations

After pulling updated backend code:

```powershell
python manage.py migrate
```

If a future model change does not include its migration file, run `python manage.py makemigrations` and then `python manage.py migrate`.

## API details

See [`API_ENDPOINTS.md`](API_ENDPOINTS.md) for endpoint list, authentication, request notes, and current limitations.

## Tests

```powershell
python manage.py test projects
```

## CORS / frontend

CORS allows `http://127.0.0.1:5500`, `http://localhost:5500`, `http://127.0.0.1:5501`, and `http://localhost:5501`. If Live Server uses another port, add that exact origin to `CORS_ALLOWED_ORIGINS`.

## Reminder delivery

Events with a `reminder_at` timestamp are delivered by the command below to users who have email notifications enabled and a saved account email:

```powershell
python manage.py send_research_reminders --dry-run
python manage.py send_research_reminders
```

Schedule `python manage.py send_research_reminders` periodically using Windows Task Scheduler (for example, every 5 minutes) or cron. Configure SMTP first; the default local email backend writes messages to the server console. Each successful send records `reminder_sent_at` to prevent duplicate sends.

## Optional scanned-PDF OCR

Install OCRmyPDF and its Tesseract dependency on the host, then set `OCR_ENABLED=True`. The upload pipeline first attempts normal `pypdf` text extraction; OCR runs only when no text was extracted. OCR is optional because the system executable is not installed by pip requirements.

## Local uploads

Uploaded PDFs are stored under `media/research_pdfs/`. This is local filesystem storage for development. Configure private/object storage and access controls before production deployment.
