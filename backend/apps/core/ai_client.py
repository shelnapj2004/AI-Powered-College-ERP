"""
FastAPI AI Services — configuration.

This module is consumed by Django when proxying requests to AI microservices.
Business chatbot logic lives in separate FastAPI routers (not implemented yet).
"""
from django.conf import settings


def get_ai_service_base_url() -> str:
    return settings.AI_SERVICE_BASE_URL


def get_ai_service_timeout() -> int:
    return settings.DJANGO_TO_AI_SERVICE_TIMEOUT_SECONDS
