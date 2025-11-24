from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib import messages
from doerapp.models import EmailOTP, Message, Profile, Provider, Review, ServiceCategory, ServiceRequest,ChatRoom, WebinarPoster, WebinarRegistration
from doerapp.tasks import send_provider_approval_email, send_provider_rejection_email


admin.site.register(Profile)
admin.site.register(ServiceCategory)
admin.site.register(ServiceRequest)
admin.site.register(ChatRoom)
admin.site.register(Message)
admin.site.register(EmailOTP)
admin.site.register(WebinarPoster)
admin.site.register(WebinarRegistration)
admin.site.register(Review)


# Register Provider model
@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    # Fields to display in the list view
    list_display = (
        'id', 'username', 'email', 'service_category', 'location', 'phone', 'bio',
        'aadhaar_number', 'experience', 'verified', 'email_verified',
        'rejection_reason', 'is_online'
    )

    # Filters for the admin interface
    list_filter = ('verified', 'service_category', 'email_verified')

    # Search fields
    search_fields = ('username', 'email', 'service_category')

    # Fields to exclude from the edit form
    exclude = ('aadhaar_document', 'documents')

    # Fields to make read-only
    readonly_fields = ('email_verified', 'user')

    # Fields for editing
    fields = (
        'user', 'username', 'email', 'phone', 'location', 'service_category',
        'bio', 'aadhaar_number', 'experience', 'verified',
        'email_verified', 'rejection_reason'
    )

    # Add custom actions
    actions = ['approve_providers', 'reject_providers', 'delete_providers']

    # ---------- Custom Actions ----------

    def approve_providers(self, request, queryset):
        """Approve selected providers."""
        updated = 0

        for provider in queryset:
            if provider.verified:
                self.message_user(
                    request,
                    f"Provider {provider.username} is already approved.",
                    level=messages.WARNING,
                )
                continue

            provider.verified = True
            provider.rejection_reason = None
            provider.save()

            # Send approval email via Celery
            send_provider_approval_email.delay(
                provider.username,
                provider.email
            )

            updated += 1

        if updated > 0:
            self.message_user(
                request,
                f"{updated} provider(s) approved successfully.",
                messages.SUCCESS,
            )

    approve_providers.short_description = "Approve selected providers"

    def reject_providers(self, request, queryset):
        """Reject selected providers."""
        updated = 0
        default_reason = (
            "Your profile did not meet our requirements. "
            "Please contact support for details."
        )

        for provider in queryset:
            provider.verified = False
            provider.rejection_reason = default_reason
            provider.save()

            # Send rejection email via Celery
            send_provider_rejection_email.delay(
                provider.username,
                provider.email,
                provider.rejection_reason
            )

            updated += 1

        if updated > 0:
            self.message_user(
                request,
                f"{updated} provider(s) rejected successfully.",
                messages.SUCCESS,
            )

    reject_providers.short_description = "Reject selected providers"

    def delete_providers(self, request, queryset):
        """Delete selected providers and their users."""
        deleted_count = 0

        for provider in queryset:
            try:
                provider.delete()
                deleted_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error deleting provider {provider.username}: {str(e)}",
                    level=messages.ERROR,
                )

        if deleted_count > 0:
            self.message_user(
                request,
                f"{deleted_count} provider(s) deleted successfully.",
                messages.SUCCESS,
            )

    delete_providers.short_description = "Delete selected providers and their users"

    # ---------- Show all providers ----------
    def get_queryset(self, request):
        """Show all providers (approved + pending)."""
        qs = super().get_queryset(request)
        return qs.order_by('verified')  # optional: pending first
