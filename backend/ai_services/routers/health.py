from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """AI services health check."""
    return {
        "success": True,
        "service": "college-erp-ai",
        "status": "healthy",
    }
