# YUKTI: AI Decision Intelligence System for Constituency Development

YUKTI is a premium, evidence-based Decision Intelligence System built to assist Members of Parliament (MPs) and local government officers in prioritizing public works and optimization planning. It integrates citizen feedback with ward demographic statistics, public datasets, and deterministic optimization algorithms.

---

## Folder Structure

```text
yukti/
├── frontend/             # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/   # UI elements
│   │   ├── pages/        # Route views (Home, Login, MP, Citizen, Officer)
│   │   ├── layouts/      # Dashboard views (sidebar navigation, theme toggle)
│   │   ├── styles/       # Tailwind stylesheet
│   │   ├── store/        # Zustand state stores
│   │   └── services/     # Axios client
│   └── Dockerfile
│
├── backend/              # FastAPI + SQLAlchemy + Alembic + PostgreSQL
│   ├── api/routes/       # APIRouter paths
│   ├── models/           # SQLAlchemy DB models (User table)
│   ├── schemas/          # Pydantic validation schemas
│   ├── repositories/     # Database repository layer
│   ├── database/         # Session manager & pooling check
│   ├── core/             # Configuration & logging module
│   └── Dockerfile
│
├── docs/                 # Documentation directory
├── deployment/           # Production deployment specs
├── docker-compose.yml    # Full services configuration
├── .gitignore
├── LICENSE
└── README.md
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Lucide React, Recharts, Framer Motion.
- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Alembic, PostgreSQL (psycopg2-binary), Pydantic v2, PyJWT, python-dotenv, Pandas, NumPy.
- **Infrastructure**: Docker & docker-compose.

---

## Local Setup

### 1. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install requirements:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Or .\venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
3. Copy and customize the environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install packages and run dev script:
   ```bash
   npm install
   npm run dev
   ```
3. Access the web portal at `http://localhost:3000`.

---

## Docker Compose

To boot all containers (FastAPI, React, PostgreSQL database) with a single command:
```bash
docker-compose up --build
```
- API Docs: `http://localhost:8000/docs`
- Web App: `http://localhost:3000`

---

## Authentication & Authorization System

### Token Lifecycle
1. **Access Token**: JWT token containing `sub` (email) and `role` claims. Expiry: 60 minutes.
2. **Refresh Token**: Signed JWT token stored in `localStorage`. Expiry: 7 days.
3. **Automatic Refresh**: The frontend Axios client automatically intercepting `401 Unauthorized` responses to query `/api/auth/refresh` and silently retrieve a new access token without interrupting active user sessions.

### Role Hierarchy & Access Rules
The system enforces role checks at both backend router dependency layers and frontend route navigation views:
- **Citizen**: Can access the Grievance Portal to submit text, audio transcripts, or image reports.
- **Officer**: Audits pending citizen reports, adjusts category classification, and validates/promotes claims to proposed constituency projects.
- **MP**: Accesses core decision intelligence metrics, runs portfolio optimizations, and tests scenario simulations.

