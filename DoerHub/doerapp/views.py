import json
import logging
from django.forms import ValidationError
from django.shortcuts import get_object_or_404
import razorpay
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from django.contrib.auth import authenticate,login
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from datetime import date, timedelta
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from random import randint
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User

from doerapp.tasks import send_contact_email
from .serializers import (
    ChatRoomSerializer, ContactMessageSerializer, MessageSerializer, NotificationSerializer, ServiceRequestSerializer, ServiceReviewSerializer,
    SignupSerializer, ProfileSerializer, ProviderSerializer, WebinarPosterSerializer
)
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from doerapp.models import ChatRoom, Notification, Profile, Provider, EmailOTP, Review, ServiceCategory, ServiceRequest, Message, WebinarPoster, WebinarRegistration
import math
from django.db.models import FloatField, Value,Q
from django.db.models.functions import Radians, Cos, Sin, Power, Sqrt, ATan2, Cast

from doerapp import models


# ----------------------------------------------------------
# USER AUTH & PROFILE MANAGEMENT
# ----------------------------------------------------------

class SignupAPI(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Optional: Auto-login and return JWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "success": "Account created successfully",
                "username": user.username,
                "email": user.email,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_201_CREATED)

        # Return serializer errors (field-level)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class LoginAPI(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Invalid credentials"}, status=401)

        provider = getattr(user, "provider", None)

        # Provider validation only if user is provider
        if provider:
            if not provider.verified:
                return Response({"error": "Admin approval pending."}, status=403)
            if not provider.email_verified:
                return Response({"error": "Email not verified."}, status=403)

        login(request, user)
        refresh = RefreshToken.for_user(user)

        # Prepare user data
        user_data = {
            "id": user.id,
            "username": user.username,
            "is_provider": provider is not None,
        }

        # If provider, include provider_id (IMPORTANT!)
        if provider:
            user_data["provider_id"] = provider.id

        # Profile only for normal users
        if not provider:
            try:
                from .serializers import ProfileSerializer
                user_data["profile"] = ProfileSerializer(user.profile).data
            except:
                user_data["profile"] = None

        return Response({
            "message": "Login successful",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_data
        })




class LogoutAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"success": "Logout successful (client-side)"}, status=status.HTTP_200_OK)


class ProfileAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        serializer = ProfileSerializer(request.user.profile)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user.profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": "Profile updated", "profile": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------------------------------------
# PROVIDER REGISTRATION & EMAIL VERIFICATION
# ----------------------------------------------------------

class ProviderRegistrationAPI(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        email = request.data.get("email")
        username = request.data.get("username")
        password = request.data.get("password")
        location = request.data.get("location")
        location_lat = request.data.get("location_lat")
        location_lon = request.data.get("location_lon")

        if not all([email, username, password, location]):
            return Response({"error": "Email, username, password, and location required."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=400)

        try:
            EmailOTP.objects.get(email=email)
            return Response({"error": "Email must be verified first."}, status=400)
        except EmailOTP.DoesNotExist:
            pass

        if not (location_lat and location_lon):
            try:
                geolocator = Nominatim(user_agent="provider_reg")
                geo = geolocator.geocode(location, timeout=10)
                if geo:
                    location_lat, location_lon = geo.latitude, geo.longitude
                else:
                    return Response({"error": "Invalid location."}, status=400)
            except (GeocoderTimedOut, GeocoderUnavailable):
                return Response({"error": "Geocoding failed."}, status=400)

        user = User.objects.create_user(username=username, email=email, password=password)
        if Provider.objects.filter(user=user).exists():
            return Response({"error": "Already a provider."}, status=400)

        provider_data = request.data.copy()
        provider_data.update({
            'location_lat': location_lat,
            'location_lon': location_lon,
            'email_verified': True
        })

        serializer = ProviderSerializer(data=provider_data, context={'user': user})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Provider registered. Awaiting approval."}, status=201)
        return Response(serializer.errors, status=400)


class GenerateProviderEmailOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email required."}, status=400)

        otp = str(randint(100000, 999999))

        EmailOTP.objects.update_or_create(
            email=email,
            defaults={'otp': otp, 'created_at': timezone.now()}
        )

        # Send OTP using Celery
        from doerapp.tasks import send_otp_email_task
        send_otp_email_task.delay(email, otp)

        return Response({"message": "OTP sent."}, status=200)


class CheckUsernameView(APIView):

    def get(self, request):
        username = request.GET.get("username", "").strip()

        exists = (
            User.objects.filter(username__iexact=username).exists() or
            Provider.objects.filter(username__iexact=username).exists()
        )

        return Response({"exists": exists})

class VerifyProviderEmailOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")
        if not (email and otp):
            return Response({"error": "Email and OTP required."}, status=400)

        try:
            entry = EmailOTP.objects.get(email=email)
        except EmailOTP.DoesNotExist:
            return Response({"error": "No OTP found."}, status=400)

        if entry.otp != otp:
            return Response({"error": "Invalid OTP."}, status=400)
        if timezone.now() - entry.created_at > timedelta(minutes=10):
            return Response({"error": "OTP expired."}, status=400)

        entry.delete()
        return Response({"message": "Email verified."})


# ----------------------------------------------------------
# SERVICE CATEGORY LIST
# ----------------------------------------------------------

class ServiceCategoryListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # get ?type=immediate or ?type=scheduled from query params
        category_type = request.query_params.get("type")

        if category_type:
            categories = ServiceCategory.objects.filter(category_type__iexact=category_type)
        else:
            categories = ServiceCategory.objects.all()

        data = [{"value": c.id, "label": c.name} for c in categories]
        return Response(data)

# ----------------------------------------------------------
# PROVIDER PROFILE & SERVICE
# ----------------------------------------------------------

class ProviderProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.provider
        except Provider.DoesNotExist:
            return None

    def get(self, request):
        provider = self.get_object()
        if not provider:
            return Response({"detail": "Not found"}, status=404)
        return Response(ProviderSerializer(provider).data)

    def patch(self, request):
        provider = self.get_object()
        if not provider:
            return Response({"detail": "Not found"}, status=404)
        if 'phone' in request.data:
            provider.phone = request.data['phone']
        if "profile_picture" in request.FILES:
            provider.profile_picture = request.FILES["profile_picture"]
            provider.save()
        return Response(ProviderSerializer(provider).data)


class AddServiceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        provider = getattr(request.user, "provider", None)
        if not provider:
            return Response({"detail": "Not a provider"}, status=404)

        service_id = request.data.get('service_category')
        if not service_id:
            return Response({"detail": "Service ID required"}, status=400)

        try:
            service = ServiceCategory.objects.get(id=service_id)
        except ServiceCategory.DoesNotExist:
            return Response({"detail": "Service not found"}, status=404)

        provider.service_category = service
        provider.save()
        return Response({"detail": f"Service '{service.name}' added."})



#-----------------------------------------------------------------
#                 Track The provider
#-----------------------------------------------------------------

class ProviderLocationUpdateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            provider = user.provider
        except Provider.DoesNotExist:
            return Response({"detail": "Provider not found"}, status=404)

        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")

        if latitude is not None and longitude is not None:
            provider.location_lat = latitude
            provider.location_lon    = longitude
            provider.is_online = True
            provider.save()
            return Response({"detail": "Location updated"}, status=200)
        return Response({"detail": "Invalid data"}, status=400)


class ProviderStopTrackingAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            provider = user.provider
        except Provider.DoesNotExist:
            return Response({"detail": "Provider not found"}, status=404)

        provider.is_online = False
        provider.save()
        return Response({"detail": "Provider marked offline"}, status=200)

# ----------------------------------------------------------
# HAVERSINE (DB VERSION)
# ----------------------------------------------------------

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = Radians(lat2 - lat1)
    dlon = Radians(lon2 - lon1)
    a = Power(Sin(dlat / 2), 2) + Cos(Radians(lat1)) * Cos(Radians(lat2)) * Power(Sin(dlon / 2), 2)
    c = 2 * ATan2(Sqrt(a), Sqrt(1 - a))
    return R * c


# ----------------------------------------------------------
# USER: CREATE REQUEST + AUTO SEND TO NEARBY PROVIDERS ✅ (with debug prints)
# ----------------------------------------------------------

class ServiceRequestAPI(generics.ListCreateAPIView):
    """
    ✅ Authenticated user can create new service request.
    ✅ Automatically broadcasts new request to nearby providers (within 10km).
    ✅ Prints debug info at every step for development.
    """

    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ServiceRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user

        print("🧩 perform_create() called")
        print(f"➡️ Authenticated user: {user}")

        if not user or not user.is_authenticated:
            raise ValidationError("You must be logged in to create a request.")

        # ✅ Save the new service request
        sr = serializer.save(user=user, status="pending")
        print(f"✅ Created ServiceRequest ID={sr.id}, category={sr.service_category}")

        # ✅ Find nearby providers (within 10km, same category)
        if not (sr.location_lat and sr.location_lon and sr.service_category):
            print("⚠️ Missing location or category — cannot find nearby providers.")
            return

        print("📍 Searching for nearby providers...")

        nearby_providers = (
            Provider.objects.filter(
                service_category=sr.service_category,
                is_online=True,
                verified=True,
                location_lat__isnull=False,
                location_lon__isnull=False,
            )
            .annotate(
                distance_km=haversine_distance(
                    Cast("location_lat", FloatField()),
                    Cast("location_lon", FloatField()),
                    Value(sr.location_lat),
                    Value(sr.location_lon),
                )
            )
            .filter(distance_km__lte=10)
            .order_by("distance_km")
        )

        print(f"🔎 Found {nearby_providers.count()} nearby providers.")
        for p in nearby_providers:
            print(f"   🧍 Provider: {p.user.username} | ID={p.id} | Dist={getattr(p, 'distance_km', '?')}km")

        if not nearby_providers.exists():
            print("⚠️ No providers found nearby.")
            return

        # ✅ WebSocket broadcast to providers
        print("📡 Broadcasting via Django Channels...")
        try:
            channel_layer = get_channel_layer()
            for provider in nearby_providers:
                async_to_sync(channel_layer.group_send)(
                    f"provider_{provider.id}",
                    {
                        "type": "new.request",
                        "request_id": sr.id,
                        "service_category": sr.service_category.name,
                        "message": f"New nearby request for {sr.service_category.name}",
                    },
                )
                print(f"   🚀 Sent WS message to provider_{provider.id}")
            print("✅ Broadcast complete.")
        except Exception as e:
            print(f"❌ WebSocket broadcast failed: {e}")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        for item in response.data["results"] if "results" in response.data else response.data:
            item["can_cancel"] = item["status"] == "pending"
        return response

# ======================================================
# 📌 PROVIDER INCOMING REQUESTS
# ======================================================
class ProviderIncomingRequestsAPI(generics.ListAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        print("🧩 ProviderIncomingRequestsAPI called for user:", user)

        if not hasattr(user, "provider"):
            print("⚠️ No provider profile found for this user.")
            return ServiceRequest.objects.none()

        provider = user.provider
        print(f"➡️ Provider ID={provider.id}, Lat={provider.location_lat}, Lon={provider.location_lon}")

        if not provider.location_lat or not provider.location_lon:
            print("⚠️ Provider has no saved location.")
            return ServiceRequest.objects.none()

        if not provider.service_category:
            print("⚠️ Provider has no assigned service category.")
            return ServiceRequest.objects.none()

        print(f"📍 Searching pending requests in category={provider.service_category} within 10km")

        qs = (
            ServiceRequest.objects.filter(
                service_category=provider.service_category,
                status="pending",
                provider__isnull=True,
                location_lat__isnull=False,
                location_lon__isnull=False,
            )
            .annotate(
                distance_km=haversine_distance(
                    Cast("location_lat", FloatField()),
                    Cast("location_lon", FloatField()),
                    Value(provider.location_lat),
                    Value(provider.location_lon),
                )
            )
            .filter(distance_km__lte=10)
            .order_by("distance_km")
        )

        print(f"✅ Found {qs.count()} pending requests nearby.")
        for r in qs:
            print(f"   🔹 Request ID={r.id} | Dist={getattr(r, 'distance_km', '?')} km | Status={r.status}")

        return qs


# ======================================================
# 🚀 SAFE PROVIDER ACCEPT API (CBV)
# # ======================================================

class AcceptServiceRequestAPI(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            sr = ServiceRequest.objects.select_for_update().get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response({"detail": "Request not found"}, status=404)

        if not hasattr(request.user, "provider"):
            return Response({"detail": "Not a provider"}, status=403)

        provider = request.user.provider

        # BLOCK 1: Request already accepted by someone
        if sr.provider is not None:
            return Response({"detail": "Request already accepted by another provider"}, status=400)

        # BLOCK 2: Provider already has an active (accepted) request
        has_active_request = ServiceRequest.objects.filter(
            provider=provider,
            status="accepted"  # This is the key!
        ).exists()

        if has_active_request:
            return Response({
                "detail": "You already have an active service request. "
                          "Complete or cancel it before accepting a new one."
            }, status=403)

        # Assign provider
        sr.provider = provider
        sr.status = "accepted"
        sr.save()

        # Create chatroom
        chatroom, _ = ChatRoom.objects.get_or_create(
            service_request=sr,
            defaults={"user": sr.user, "provider": request.user}
        )

        # Notify user via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"request_{sr.id}",
            {
                "type": "request.accepted",
                "chatroom_id": chatroom.id,
                "provider_name": request.user.username
            }
        )

        return Response({
            "status": "accepted",
            "chatroom_id": chatroom.id,
            "request_id": sr.id,
            "message": "Request accepted successfully"
        }, status=200)


class RejectServiceRequestAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        sr = get_object_or_404(ServiceRequest, pk=pk)

        if not hasattr(request.user, "provider"):
            return Response({"detail": "Not authorized"}, status=403)

        sr.status = "rejected"
        sr.save()

        # SEND REALTIME REJECTION
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"request_{sr.id}",
            {
                "type": "request.rejected"   # matches consumer method name
            }
        )

        return Response({"status": "rejected", "request_id": sr.id})

# ----------------------------------------------------------
# USER: CANCEL REQUEST
# ----------------------------------------------------------

class CancelServiceRequestAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        print(f"🧩 CancelServiceRequestAPI called by user={request.user}, Request ID={pk}")

        try:
            sr = ServiceRequest.objects.get(id=pk, user=request.user)
            print(f"✅ Found ServiceRequest ID={sr.id}, Status={sr.status}")
        except ServiceRequest.DoesNotExist:
            print("❌ Request not found or not owned by user.")
            return Response({"error": "Not found"}, status=404)

        if sr.status in ["accepted", "completed"]:
            print(f"⚠️ Cannot cancel: current status={sr.status}")
            return Response({"error": "Cannot cancel"}, status=400)

        sr.status = "cancelled"
        sr.save()
        print("✅ Request successfully cancelled.")

        return Response({
            "message": "Cancelled",
            "status": "cancelled",
            "request_id": sr.id,
        })
    
class ServiceRequestStatusAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            sr = ServiceRequest.objects.get(id=pk, user=request.user)
            return Response({
                "status": sr.status,
                "provider": sr.provider.user.username if sr.provider else None,
                "chatroom_id": sr.chatroom.id if hasattr(sr, 'chatroom') else None
            })
        except ServiceRequest.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


#-------------------------------------------------------
#PROVIDER: MARK COMPLETED REQUEST
#-------------------------------------------------------

class MarkServiceCompletedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            service = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Service request not found'}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Check provider authorization
        if not service.provider or service.provider.user != request.user:
            return Response({'error': 'You are not authorized to complete this service.'},
                            status=status.HTTP_403_FORBIDDEN)

        # ✅ Only allow completion if status is 'accepted'
        if service.status != 'accepted':
            return Response({'error': 'Only accepted services can be marked as completed.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # ✅ Update status
        service.status = 'completed'
        service.save()

        return Response({'message': 'Service marked as completed successfully.', 'status': service.status})


# ----------------------------------------------------------
# CHATROOM INIT OR REDIRECT (ENHANCED WITH PRINTS)
# ----------------------------------------------------------

class GetOrCreateChatRoomAPI(APIView):
    """
    Returns existing ChatRoom for a service request or provider,
    or creates new ServiceRequest + ChatRoom if needed.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, service_request_id=None):
        user = request.user
        provider_id = request.data.get("provider_id")

        print("\n🔹 [GetOrCreateChatRoomAPI] Request received")
        print(f"➡️ User: {user.email}")
        print(f"➡️ service_request_id: {service_request_id}")
        print(f"➡️ provider_id: {provider_id}")

        # ✅ Case 1: Existing ServiceRequest
        if service_request_id:
            try:
                service_request = ServiceRequest.objects.get(pk=service_request_id)
                print(f"✅ Found existing ServiceRequest: {service_request.id}")
            except ServiceRequest.DoesNotExist:
                print("❌ Service request not found")
                return Response({"detail": "Service request not found"}, status=404)

        # ✅ Case 2: Chat directly using provider_id
        elif provider_id:
            try:
                provider = Provider.objects.get(pk=provider_id)
                print(f"✅ Found provider: {provider.id}")
            except Provider.DoesNotExist:
                print("❌ Provider not found")
                return Response({"detail": "Provider not found"}, status=404)

            service_request, created = ServiceRequest.objects.get_or_create(
                user=user,
                provider=provider,
                defaults={"status": "pending"}
            )

            if created:
                print(f"🆕 Created new ServiceRequest: {service_request.id}")
            else:
                print(f"♻️ Reused existing ServiceRequest: {service_request.id}")

        else:
            print("⚠️ Missing both service_request_id and provider_id")
            return Response({"detail": "Missing service_request_id or provider_id"}, status=400)

        # ✅ ChatRoom creation or fetch
        chatroom, created = ChatRoom.objects.get_or_create(
            service_request=service_request,
            defaults={
                "user": service_request.user,
                "provider": getattr(service_request, "provider", None),
            },
        )

        if created:
            print(f"🆕 Created new ChatRoom: {chatroom.id}")
        else:
            print(f"♻️ Found existing ChatRoom: {chatroom.id}")

        serializer = ChatRoomSerializer(chatroom)
        print(f"✅ Returning ChatRoom data: {serializer.data}\n")
        return Response(serializer.data, status=201 if created else 200)


# ----------------------------------------------------------
# CHATROOM DETAIL
# ----------------------------------------------------------

class ChatRoomDetailAPI(generics.RetrieveAPIView):
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        print("\n🔹 [ChatRoomDetailAPI] Fetching ChatRoom...")
        instance = self.get_object()
        print(f"✅ ChatRoom found: ID {instance.id}")
        serializer = self.get_serializer(instance)
        print(f"📤 Returning ChatRoom details for {instance.id}\n")
        return Response(serializer.data)


# ----------------------------------------------------------
# START CHAT
# ----------------------------------------------------------
class StartChatAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        provider_id = request.data.get("provider_id")
        print("\n[StartChatAPI] POST received – provider_id:", provider_id)

        if not provider_id:
            print("   → Missing provider_id")
            return Response({"error": "Provider ID is required"}, status=400)

        try:
            provider = Provider.objects.get(id=provider_id)
            print("   → Provider found:", provider.id, provider.user.email)
        except Provider.DoesNotExist:
            print("   → Provider NOT found")
            return Response({"error": "Provider not found"}, status=404)

        chatroom, created = ChatRoom.objects.get_or_create(
            user=request.user,
            provider=provider.user,
        )
        print(f"   → ChatRoom {chatroom.id} – created={created}")

        # ────── NOTIFY ONLY ON NEW CHAT ──────
        if created:
            print("   → NEW chat → sending notification")
            try:
                channel_layer = get_channel_layer()
                if channel_layer is None:
                    print("   → channel_layer IS NONE")
                else:
                    print("   → channel_layer OK")
                group_name = f"provider_notify_{provider.id}"
                print(f"   → group_send to: {group_name}")

                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "new_chat_notification",
                        "chatroom_id": chatroom.id,
                        "message": "New chat started by user",
                        "sender": request.user.username or request.user.email,
                    },
                )
                print("   → group_send executed")
            except Exception as e:
                print("   → group_send FAILED:", e, type(e))

        return Response({
            "chatroom_id": chatroom.id,
            "created": created,
            "message": "Chat room ready"
        }, status=201 if created else 200)


# ----------------------------------------------------------
# SEND MESSAGE
# ----------------------------------------------------------
class SendMessageAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chatroom_id):
        print("\n[SendMessageAPI] POST – chat_id:", chatroom_id)

        try:
            chatroom = ChatRoom.objects.get(pk=chatroom_id)
            print("   → ChatRoom found:", chatroom.id)
        except ChatRoom.DoesNotExist:
            print("   → ChatRoom NOT found")
            return Response({"detail": "Not found"}, status=404)

        content = request.data.get("content", "").strip()
        print("   → Content:", repr(content))

        if not content:
            print("   → Empty content → reject")
            return Response({"detail": "Empty message"}, status=400)

        message = Message.objects.create(chatroom=chatroom, sender=request.user, content=content)
        print("   → Message saved, id:", message.id)

        # ────── NOTIFY PROVIDER ──────
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                print("   → channel_layer IS NONE")
            else:
                print("   → channel_layer OK")

            # Provider is the *other* participant
            provider = chatroom.provider
            group_name = f"provider_notify_{provider.id}"
            print(f"   → Sending to group: {group_name}")

            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "new_chat_notification",
                    "chatroom_id": chatroom.id,
                    "message": content,
                    "sender": request.user.username or request.user.email,
                },
            )
            print("   → group_send executed")
        except Exception as e:
            print("   → group_send FAILED:", e, type(e))

        return Response(MessageSerializer(message).data, status=201)
    


class ProvidersByCategoryAPI(generics.ListAPIView):
    serializer_class = ProviderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        category_id = self.request.query_params.get("category")
        if not category_id:
            return Provider.objects.none()
        return Provider.objects.filter(
            service_category_id=category_id,
            verified=True
        ).select_related("user", "service_category").order_by("user__username")
    

class ProviderDetailAPI(generics.RetrieveAPIView):
    """
    Returns full details of a single provider (by ID)
    """
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    permission_classes = [permissions.AllowAny]




class ProviderRequestListAPI(generics.ListAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        provider = self.request.user.provider
        status_filter = self.request.query_params.get("status")
        qs = ServiceRequest.objects.filter(provider=provider)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-id")

# ----------------------------------------------------------
#webinar
# ----------------------------------------------------------       

logger = logging.getLogger(__name__)

# ============================================================
# 1. Create & List Upcoming Webinars (Provider)
# ============================================================
class ProviderWebinarAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posters = WebinarPoster.objects.filter(
            provider=request.user,
            webinar_date__gte=timezone.now().date()
        ).order_by("-created_at")
        serializer = WebinarPosterSerializer(posters, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = WebinarPosterSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            instance = serializer.save(provider=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# 2. Provider Dashboard (All webinars + registrations)
# ============================================================
class ProviderWebinarDashboardAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        webinars = WebinarPoster.objects.filter(provider=request.user).prefetch_related('webinarregistration_set')
        data = []
        for w in webinars:
            regs = w.webinarregistration_set.all()
            data.append({
                "id": w.id,
                "title": w.title,
                "date": w.webinar_date,
                "type": w.webinar_type,
                "price": float(w.price) if w.price else None,
                "image": request.build_absolute_uri(w.image.url) if w.image else None,
                "registrations_count": regs.count(),
                "registrations": [
                    {
                        "user_name": r.user.get_full_name() or r.user.username,
                        "email": r.user.email,
                        "registered_at": r.registered_at.isoformat(),
                        "is_paid": r.is_paid,
                        "payment_id": r.payment_id or "Free",
                    }
                    for r in regs
                ]
            })
        return Response(data)


# ============================================================
# 3. Public Webinar List
# ============================================================
class WebinarListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        webinars = WebinarPoster.objects.filter(
            webinar_date__gte=timezone.now().date()
        ).order_by('webinar_date')
        serializer = WebinarPosterSerializer(webinars, many=True)
        return Response(serializer.data)

#------------------------------------------------------------
#oWNED WEBINARS
#------------------------------------------------------------

class ProviderOwnedWebinarsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # return ALL webinars owned by the provider
        webinars = WebinarPoster.objects.filter(provider=request.user).order_by('-webinar_date')
        
        serializer = WebinarPosterSerializer(webinars, many=True)
        return Response(serializer.data)
    
# ============================================================
# 4. Webinar Detail + Edit/Delete (Owner only)
# ============================================================
class WebinarDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        webinar = get_object_or_404(WebinarPoster, pk=pk)
        serializer = WebinarPosterSerializer(webinar, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        webinar = get_object_or_404(WebinarPoster, pk=pk)
        if webinar.provider != request.user:
            return Response({"error": "Permission denied."}, status=403)
        serializer = WebinarPosterSerializer(webinar, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        webinar = get_object_or_404(WebinarPoster, pk=pk)
        if webinar.provider != request.user:
            return Response({"error": "Permission denied."}, status=403)
        webinar.delete()
        return Response(status=204)


# ============================================================
# 5. Payment Init (Paid Webinar)
# ============================================================
class WebinarPaymentInitAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            webinar = WebinarPoster.objects.get(pk=pk)
            if webinar.webinar_type != "paid":
                return Response({"error": "This is a free webinar."}, status=400)

            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            amount = int(webinar.price * 100)
            order = client.order.create({
                "amount": amount,
                "currency": "INR",
                "payment_capture": "1"
            })
            return Response({
                "order_id": order["id"],
                "amount": amount,
                "currency": "INR",
                "key": settings.RAZORPAY_KEY_ID,
                "webinar_title": webinar.title,
            })
        except WebinarPoster.DoesNotExist:
            return Response({"error": "Webinar not found"}, status=404)


# ============================================================
# 6. Register + Check Registration (Free & Paid)
# ============================================================
class WebinarRegisterAPI(APIView):
    permission_classes = [IsAuthenticated]

    # GET: Check if already registered
    def get(self, request, pk):
        try:
            webinar = WebinarPoster.objects.get(pk=pk)
            is_registered = WebinarRegistration.objects.filter(
                user=request.user, webinar=webinar
            ).exists()
            return Response({"is_registered": is_registered})
        except WebinarPoster.DoesNotExist:
            return Response({"error": "Webinar not found"}, status=404)

    # POST: Register
    def post(self, request, pk):
        try:
            webinar = WebinarPoster.objects.get(pk=pk)
        except WebinarPoster.DoesNotExist:
            return Response({"error": "Webinar not found"}, status=404)

        # Owner cannot register
        if webinar.provider == request.user:
            return Response(
                {"error": "You cannot register for your own webinar."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Prevent duplicate
        if WebinarRegistration.objects.filter(user=request.user, webinar=webinar).exists():
            return Response(
                {"error": "You are already registered for this webinar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Free webinar
        if webinar.webinar_type == "free":
            WebinarRegistration.objects.create(user=request.user, webinar=webinar, is_paid=False)
            return Response({"status": "registered", "type": "free"}, status=201)

        # Paid webinar
        payment_id = request.data.get("payment_id")
        if not payment_id:
            return Response({"error": "payment_id required"}, status=400)

        WebinarRegistration.objects.create(
            user=request.user,
            webinar=webinar,
            payment_id=payment_id,
            is_paid=True,
        )
        return Response({"status": "registered", "type": "paid", "payment_id": payment_id}, status=201)


# ============================================================
# 7. Get All Registrations for a Webinar (Owner only)
# ============================================================
class WebinarRegistrationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            webinar = WebinarPoster.objects.get(pk=pk)
            if webinar.provider != request.user:
                return Response({"error": "Unauthorized"}, status=403)

            regs = WebinarRegistration.objects.filter(webinar=webinar).select_related("user")
            data = [
                {
                    "id": r.id,
                    "user_name": r.user.get_full_name() or r.user.username,
                    "user_email": r.user.email,
                    "registered_at": r.registered_at.isoformat(),
                    "is_paid": r.is_paid,
                    "payment_id": r.payment_id or "N/A",
                }
                for r in regs
            ]
            return Response({"webinar_id": pk, "total": len(data), "registrations": data})
        except WebinarPoster.DoesNotExist:
            return Response({"error": "Webinar not found"}, status=404)


# ============================================================
# 8. Send Join Link (Owner only, only on webinar day)
# ============================================================
class WebinarSendLinkAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            webinar = WebinarPoster.objects.get(pk=pk)
            if webinar.provider != request.user:
                return Response(
                    {"error": "You are not the owner of this webinar."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            today = date.today()
            if webinar.webinar_date != today:
                return Response(
                    {
                        "error": f"Link can only be sent on the webinar day ({webinar.webinar_date}). "
                                 f"Today is {today}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            registrations = WebinarRegistration.objects.filter(webinar=webinar).select_related("user")
            if not registrations.exists():
                return Response(
                    {"detail": "No registrations yet – nothing to send."},
                    status=status.HTTP_200_OK,
                )

            # Accept typed link for the day
            input_link = request.data.get("link", "").strip()

            # Use today's provided link if available
            if input_link:
                meeting_url = input_link
            else:
                meeting_url = (webinar.meeting_url or "").strip()

            # If no link at all, return error
            if not meeting_url:
                return Response(
                    {"error": "Please provide a webinar link to send."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            subject = f"Your link for “{webinar.title}”"
            message_template = (
                f"Hi {{name}},\n\n"
                f"You're registered for the webinar **{webinar.title}**.\n"
                f"Join using the link below:\n\n"
                f"{meeting_url}\n\n"
                f"See you there!\n"
                f"{webinar.provider.get_full_name() or webinar.provider.username}"
            )

            sent_to = []
            for reg in registrations:
                user = reg.user
                personalized_msg = message_template.replace("{{name}}", user.get_full_name() or user.username)
                send_mail(
                    subject=subject,
                    message=personalized_msg,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                sent_to.append(user.email)

            logger.info("Sent webinar link for %s to %d users", pk, len(sent_to))
            return Response({
                "detail": "Link sent successfully.",
                "webinar": webinar.title,
                "sent_to_count": len(sent_to),
                "sent_to": sent_to,
            })

        except WebinarPoster.DoesNotExist:
            return Response({"error": "Webinar not found"}, status=404)
        except Exception as e:
            logger.exception("WebinarSendLinkAPI error")
            return Response({"error": str(e)}, status=500)


# ============================================================
# 9. User’s Registered Webinars
# ============================================================
class UserRegisteredWebinarsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        regs = WebinarRegistration.objects.filter(user=request.user).select_related("webinar")
        data = [
            {
                "title": reg.webinar.title,
                "date": reg.webinar.webinar_date,
                "type": reg.webinar.webinar_type,
                "price": reg.webinar.price,
                "is_paid": reg.is_paid,
                "poster": reg.webinar.image.url if reg.webinar.image else None,
            }
            for reg in regs
        ]
        return Response(data)

# -----------------------------------------------------------------
# NOTIFICATIONS
# -----------------------------------------------------------------

class NotificationListAPIView(generics.ListAPIView):
    """
    GET  /api/notifications/   →  latest 50 notifications
    Includes:
      • Personal (recipient = current user)
      • Broadcast (recipient = None)  ← admin messages
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(
            Q(recipient=self.request.user) | Q(recipient=None)
        ).order_by('-created_at')[:50]


class NotificationMarkReadAPIView(generics.GenericAPIView):
    """POST /api/notifications/<pk>/read/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(
                pk=pk, recipient=request.user
            )
            notif.is_read = True
            notif.save(update_fields=['is_read'])
            return Response({"status": "read"})
        except Notification.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


class NotificationMarkAllReadAPIView(generics.GenericAPIView):
    """POST /api/notifications/mark-all-read/ – only personal"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"status": "all read"})
    

#------------------------------------------------------------------------
#REVIEW
#------------------------------------------------------------------------

class CreateServiceReviewView(generics.CreateAPIView):
    queryset = Review.objects.all()
    serializer_class = ServiceReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        service_request = serializer.validated_data['service_request']

        # ✅ 1. Must be completed
        if service_request.status != 'completed':
            raise ValidationError("You can only review completed services.")

        # ✅ 2. User must be the requester
        if service_request.user != self.request.user:
            raise ValidationError("You are not authorized to review this service.")

        # ✅ 3. Prevent duplicate reviews
        if Review.objects.filter(
            service_request=service_request,
            user=self.request.user
        ).exists():
            raise ValidationError("You have already reviewed this service.")

        print("DEBUG: Creating review for request", service_request.id)

        serializer.save(
            user=self.request.user,
            provider=service_request.provider
        )

#USER REVIEW VIEW

class UserReviewListView(generics.ListAPIView):
    serializer_class = ServiceReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user).select_related("provider")

#PROVIDER REVIEW

# ✅ Provider-specific reviews
class ProviderReviewListView(generics.ListAPIView):
    serializer_class = ServiceReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        provider_id = self.kwargs.get("provider_id")
        return Review.objects.filter(provider_id=provider_id).select_related("user", "provider")

#LATEST 4 REVIEWS

class LatestReviewsView(generics.ListAPIView):
    queryset = Review.objects.all().order_by('-created_at')[:4]
    serializer_class = ServiceReviewSerializer
    permission_classes = [permissions.AllowAny]


class CreateDirectProviderReviewView(generics.CreateAPIView):
    serializer_class = ServiceReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        provider_id = self.request.data.get("provider_id")

        if not provider_id:
            raise ValidationError("Provider ID is required.")

        # Validate provider exists
        try:
            provider = Provider.objects.get(id=provider_id)
        except Provider.DoesNotExist:
            raise ValidationError("Invalid provider ID.")

        # OPTIONAL: Prevent user from reviewing same provider multiple times
        if Review.objects.filter(user=self.request.user, provider_id=provider_id, service_request=None).exists():
            raise ValidationError("You have already reviewed this provider.")

        # Save as a DIRECT review (service_request=None)
        serializer.save(
            user=self.request.user,
            provider=provider,
            service_request=None  # ⭐ IMPORTANT
        )

class UpdateReviewView(generics.UpdateAPIView):
    queryset = Review.objects.all()
    serializer_class = ServiceReviewSerializer
    permission_classes = [IsAuthenticated]

class DeleteReviewView(generics.DestroyAPIView):
    queryset = Review.objects.all()
    permission_classes = [IsAuthenticated]


class ContactMessageAPI(APIView):
    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            
            # Call Celery task
            send_contact_email.delay(
                serializer.data["name"],
                serializer.data["email"],
                serializer.data["message"]
            )

            return Response(
                {"message": "Your message has been sent!"},
                status=status.HTTP_201_CREATED
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# class ContactMessageAPI(APIView):
#     # No authentication required - anyone can contact
#     authentication_classes = []
#     permission_classes = []

#     def post(self, request):
#         serializer = ContactMessageSerializer(data=request.data)

#         if serializer.is_valid():
#             # Save to DB
#             contact = serializer.save()

#             # Send email immediately (no Celery)
#             try:
#                 send_mail(
#                     subject=f"New Contact Message from {serializer.validated_data['name']}",
#                     message=f"""
#                     Name: {serializer.validated_data['name']}
#                     Email: {serializer.validated_data['email']}
                    
#                     Message:
#                     {serializer.validated_data['message']}
#                     """,
#                     from_email=settings.DEFAULT_FROM_EMAIL,
#                     recipient_list=['doer.hub7@gmail.com'],  # Change to your email
#                     fail_silently=False,
#                 )
#             except Exception as e:
#                 print("Email failed:", e)
#                 # Still return success if you want form to work even if email fails
#                 # Or return error if needed

#             return Response(
#                 {"message": "Thank you! Your message has been sent successfully."},
#                 status=status.HTTP_201_CREATED
#             )

#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)