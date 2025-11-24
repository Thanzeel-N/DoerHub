from datetime import timedelta, timezone
from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ContactMessage, Notification, Profile, Provider, Review, ServiceCategory, ServiceRequest, WebinarPoster, ChatRoom, Message
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
import re
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm Password")
    phone = serializers.CharField(required=False, allow_blank=True, max_length=15)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_pic = serializers.ImageField(required=False, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone', 'address', 'profile_pic'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
        }

    # ------------------------------------------------------------------
    # Individual Field Validations
    # ------------------------------------------------------------------
    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username is required.")
        if not re.match(r'^[a-zA-Z0-9._-]{4,20}$', value):
            raise serializers.ValidationError(
                "Username must be 4–20 characters and contain only letters, numbers, ., _, -"
            )
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError("Enter a valid email address.")
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value.lower()

    def validate_phone(self, value):
        if value and not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone must be exactly 10 digits.")
        return value

    def validate_password(self, value):
        if not re.match(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
            value
        ):
            raise serializers.ValidationError(
                "Password must be at least 8 characters and include: "
                "1 uppercase, 1 lowercase, 1 digit, 1 special character (@$!%*?&)"
            )
        return value

    # ------------------------------------------------------------------
    # Cross-field validation (password match)
    # ------------------------------------------------------------------
    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    # ------------------------------------------------------------------
    # Create User + Profile
    # ------------------------------------------------------------------
    def create(self, validated_data):
        # Remove password2
        validated_data.pop('password2', None)

        # Extract profile fields
        phone = validated_data.pop('phone', None)
        address = validated_data.pop('address', None)
        profile_pic = validated_data.pop('profile_pic', None)

        # Create User
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        # Update or create Profile
        profile, _ = Profile.objects.get_or_create(user=user)
        if phone:
            profile.phone = phone
        if address:
            profile.address = address
        if profile_pic:
            profile.profile_pic = profile_pic
        profile.save()

        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_active', read_only=True)

    class Meta:
        model = Profile
        fields = ['id','username', 'email', 'is_verified', 'phone', 'address', 'profile_pic']

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.profile_picture:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None

class ProviderSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    verified = serializers.ReadOnlyField()
    email_verified = serializers.ReadOnlyField()
    service_category_name = serializers.CharField(source='service_category.name', read_only=True)

    class Meta:
        model = Provider
        fields = "__all__"
        read_only_fields = ['otp', 'otp_created_at', 'user', 'verified', 'email_verified']
        
    @transaction.atomic
    def create(self, validated_data):
        # Get user from context
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User must be provided in context.")
        
        # Set email_verified to True since verification is done before submission
        validated_data['email_verified'] = True
        # Create provider linked to the user
        provider = Provider.objects.create(user=user, **validated_data)
        return provider
    
    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.profile_pics:
            return request.build_absolute_uri(obj.profile_pics.url)
        return None



class ServiceRequestSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    provider_name = serializers.CharField(source='provider.user.username', read_only=True, default=None)
    service_category_name = serializers.CharField(source='service_category.name', read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = "__all__"
        read_only_fields = ['id', 'user', 'status', 'created_at','distance_km']

    def get_distance_km(self, obj):
        # Only available when annotated in view
        return getattr(obj, 'distance_km', None)
    
    def get_chat_id(self, obj):
        chatroom = ChatRoom.objects.filter(service_request=obj).first()
        return chatroom.id if chatroom else None



#-----------------------------------Chatroom-------------------------------------------

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'content', 'timestamp']


class ChatRoomSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    provider_name = serializers.CharField(source='provider.username', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'service_request', 'user', 'user_name', 'provider', 'provider_name', 'messages', 'created_at']




class WebinarPosterSerializer(serializers.ModelSerializer):
    webinar_poster=serializers.ImageField(source="image",read_only=True,required=False,allow_null=True)
    provider_id = serializers.ReadOnlyField(source="provider.id")
    class Meta:
        model = WebinarPoster
        fields = "__all__"
        
        read_only_fields = ['id','provider', 'created_at','provider_id']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else None
        return None
    
    def validate_webinar_date(self, value):
        if value <= timezone.now().date() + timedelta(days=3):
            raise serializers.ValidationError("Poster must be uploaded at least 7 days before the webinar date.")
        return value

    def validate(self, data):
        if data.get("webinar_type") == "paid" and not data.get("price"):
            raise serializers.ValidationError({"price": "Price is required for paid webinars."})
        return data



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'extra_data', 'is_read', 'created_at']


class ServiceReviewSerializer(serializers.ModelSerializer):
    username=serializers.CharField(source='user.username',read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'service_request', 'user', 'provider', 'rating', 'comment', 'created_at','username']
        read_only_fields = ['user', 'created_at', 'provider','username']

    def validate(self, data):
        service_request = data.get('service_request', None)

        # ⭐ CASE 1: DIRECT REVIEW (NO service_request)
        if service_request is None:
            return data  

        # ⭐ CASE 2: NORMAL REVIEW (with service_request)
        if service_request.status != 'completed':
            raise serializers.ValidationError("You can only review completed services.")

        return data


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = "__all__"
