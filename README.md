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
