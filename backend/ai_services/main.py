"""
FastAPI application entry point for AI microservices.

Three independent chatbot systems will be mounted here:
  1. Public Website Chatbot   — /public/
  2. Student AI Assistant     — /student/
  3. Teacher AI Assistant     — /teacher/

Run locally:
  uvicorn ai_services.main:app --host 127.0.0.1 --port 8001 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_services.config import settings
from ai_services.routers import health

app = FastAPI(
    title="College ERP AI Services",
    description="Independent AI chatbot microservices for the College ERP platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — business chatbot routers added in future page tasks
app.include_router(health.router, tags=["health"])

# Placeholder mounts for the three independent chatbot systems
# app.include_router(public_chatbot.router, prefix="/public", tags=["public-chatbot"])
# app.include_router(student_chatbot.router, prefix="/student", tags=["student-chatbot"])
# app.include_router(teacher_chatbot.router, prefix="/teacher", tags=["teacher-chatbot"])
