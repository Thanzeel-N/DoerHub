from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from .utils import send_broadcast_notification

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return self.user.username

class ServiceCategory(models.Model):
    CATEGORY_TYPES = [
        ("immediate", "Immediate / On-Demand"),
        ("scheduled", "Scheduled / Lifestyle"),
    ]

    name = models.CharField(max_length=50, unique=True)
    category_type = models.CharField(
        max_length=20,
        choices=CATEGORY_TYPES,
        default="scheduled"
    )

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"
    


class Provider(models.Model):
    username = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lon = models.FloatField(null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='provider_pics/', blank=True, null=True)
    is_online = models.BooleanField(default=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider')
    bio = models.TextField()

    service_category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True)
    aadhaar_number = models.CharField(max_length=12)  # Consider encrypting this field for security
    aadhaar_document = models.FileField(upload_to='aadhaar_docs/')
    verified = models.BooleanField(default=False)  # Admin verification
    availability = models.BooleanField(default=True)  # Provider is available by default
    experience = models.IntegerField()  # Years of experience
    documents = models.FileField(upload_to='provider_documents/', blank=True, null=True)  # Optional additional documents
    rejection_reason = models.TextField(blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, null=True, blank=True)  # Optional fallback storage
    otp_created_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Provider: {self.user.username}"

    def delete(self, *args, **kwargs):
        # Delete associated files from storage
        if self.aadhaar_document:
            self.aadhaar_document.delete(save=False)
        if self.documents:
            self.documents.delete(save=False)
        super().delete(*args, **kwargs)

class EmailOTP(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.email} - {self.otp}"
    




class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requests')
    service_category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True)
    location_address = models.CharField(max_length=300, blank=True)  # optional human-readable
    location_lat = models.FloatField(null=True, blank=True)
    location_lon = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} -> {self.service_category} ({self.status})"


# chatroom and message 

User = get_user_model()


class ChatRoom(models.Model):
    service_request = models.ForeignKey(
        "ServiceRequest", on_delete=models.CASCADE, related_name="chatroom",
        null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_chats")
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name="provider_chats")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom #{self.id} (User: {self.user.username} ↔ Provider: {self.provider.username})"


class Message(models.Model):
    chatroom = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"


class WebinarPoster(models.Model):
    WEBINAR_TYPE_CHOICES = [
        ("free", "Free"),
        ("paid", "Paid"),
    ]

    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name="webinar_posters")
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to="webinar_posters/")
    webinar_date = models.DateField()
    webinar_type = models.CharField(max_length=10, choices=WEBINAR_TYPE_CHOICES, default="free")
    price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    meeting_url = models.URLField(max_length=500,blank=True,help_text="Zoom/Meet/any platform URL for the live session")
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_upcoming(self):
        return self.webinar_date >= timezone.now().date()

    def __str__(self):
        return f"{self.title} ({self.get_webinar_type_display()})"


class WebinarRegistration(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    webinar = models.ForeignKey("WebinarPoster", on_delete=models.CASCADE)
    payment_id = models.CharField(max_length=200, blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "webinar")

    def __str__(self):
        return f"{self.user.username} - {self.webinar.title}"




User = get_user_model()

class Notification(models.Model):
    type = models.CharField(max_length=50, default="general")
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True
    )  # NULL = broadcast
    message = models.TextField()
    extra_data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{'[ALL]' if not self.recipient else self.recipient.username}: {self.message[:30]}"
    

@receiver(post_save, sender=ServiceCategory)
def notify_new_service_category(sender, instance, created, **kwargs):
    if created:
        message = f"New service category added: '{instance.name}'. Check it out!"
        extra_data = {
            "type": "new_category",
            "category_id": instance.id,
            "category_name": instance.name,
        }

        # 1. Save to DB
        Notification.objects.create(
            type="broadcast",
            message=message,
            recipient=None,
            extra_data=extra_data,
            is_read=False
        )

        # 2. Send via WebSocket (no model import in utils)
        send_broadcast_notification(message, extra_data)



class Review(models.Model):
    service_request = models.OneToOneField(ServiceRequest, on_delete=models.CASCADE, related_name='review',null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(default=1)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.user.username} for {self.provider.username} - {self.rating}★"


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.email}"
