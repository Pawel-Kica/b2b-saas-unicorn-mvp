# B2B SaaS Unicorn - Warm Lead Generator

Find warm B2B leads from people engaging with competitor content on LinkedIn.

## Getting Started

### 1. Configure environment variables

Copy the example `.env` at the project root and fill in your API keys:

```
APIFY_API_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

DB connection is handled automatically by Docker Compose — no need to add database vars here.

### 2. Start everything

```bash
docker compose up --build
```

This will:
- Start PostgreSQL on port 5432
- Run Django migrations automatically
- Start the backend API on http://localhost:8000
- Build and start the Next.js frontend on http://localhost:3000

### 3. Create a superuser (first time only)

```bash
docker compose exec backend python manage.py createsuperuser
```

### 4. Open the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

### Stopping

```bash
docker compose down
```

Add `-v` to also wipe the database volume: `docker compose down -v`
