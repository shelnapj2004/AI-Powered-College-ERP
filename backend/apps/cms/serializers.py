from rest_framework import serializers

from apps.cms.models import ContentPage


class ContentPageSerializer(serializers.ModelSerializer):
    page_type_display = serializers.CharField(source="get_page_type_display", read_only=True)

    class Meta:
        model = ContentPage
        fields = [
            "id",
            "title",
            "slug",
            "page_type",
            "page_type_display",
            "content",
            "meta_title",
            "meta_description",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
