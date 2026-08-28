"""Development settings."""
from .base import *  # noqa: F403

DEBUG = True

# Allow all origins in development only when explicitly enabled
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)  # noqa: F405

# Email — console backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Django Debug Toolbar can be added later if needed
