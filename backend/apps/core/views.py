from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """
    Service health check endpoint.
    Used by load balancers and deployment pipelines.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["health"],
        summary="Health check",
        description="Returns API service status. No authentication required.",
    )
    def get(self, request):
        return Response(
            {
                "success": True,
                "service": "college-erp-api",
                "status": "healthy",
                "version": request.version or "v1",
            },
            status=status.HTTP_200_OK,
        )
