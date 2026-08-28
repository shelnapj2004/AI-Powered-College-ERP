import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("user_display", models.CharField(blank=True, help_text="Snapshot of username/role at write time, kept even if the user is later deleted.", max_length=255)),
                ("action", models.CharField(choices=[
                    ("create", "Create"), ("update", "Update"), ("delete", "Delete"),
                    ("login", "Login"), ("logout", "Logout"), ("activate", "Activate"),
                    ("deactivate", "Deactivate"), ("password_reset", "Password Reset"),
                    ("role_change", "Role Change"),
                ], db_index=True, max_length=20)),
                ("resource", models.CharField(db_index=True, help_text="Resource/model name affected, e.g. 'Student', 'FeePayment'.", max_length=100)),
                ("resource_id", models.CharField(blank=True, max_length=64)),
                ("description", models.CharField(blank=True, max_length=500)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("user", models.ForeignKey(blank=True, help_text="User who performed the action (null if system/anonymous).", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["resource", "action"], name="adminpanel__resourc_c1f1c3_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["-created_at"], name="adminpanel__created_5f5c0e_idx"),
        ),
    ]
