from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Wrap DRF exceptions in a consistent API error envelope.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "success": False,
            "error": {
                "code": _resolve_error_code(exc),
                "message": _resolve_error_message(response.data),
                "details": response.data if isinstance(response.data, dict) else {"detail": response.data},
            },
        }
        response.data = error_payload

    return response


def _resolve_error_code(exc):
    if hasattr(exc, "default_code"):
        return exc.default_code
    if isinstance(exc, APIException):
        return "api_error"
    return "unknown_error"


def _resolve_error_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            detail = data["detail"]
            return str(detail) if not isinstance(detail, list) else "; ".join(str(item) for item in detail)
        if "non_field_errors" in data:
            errors = data["non_field_errors"]
            return errors[0] if errors else "Validation error"
        first_key = next(iter(data), None)
        if first_key:
            value = data[first_key]
            if isinstance(value, list) and value:
                return f"{first_key}: {value[0]}"
            return f"{first_key}: {value}"
    if isinstance(data, list) and data:
        return str(data[0])
    return "An error occurred"
