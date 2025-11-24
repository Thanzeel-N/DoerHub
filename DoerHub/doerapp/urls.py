from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    AddServiceView,
    CancelServiceRequestAPI,
    ChatRoomDetailAPI,
    CheckUsernameView,
    ContactMessageAPI,
    CreateDirectProviderReviewView,
    CreateServiceReviewView,
    DeleteReviewView,
    GetOrCreateChatRoomAPI,
    LatestReviewsView,
    MarkServiceCompletedView,
    NotificationListAPIView,
    NotificationMarkAllReadAPIView,
    NotificationMarkReadAPIView,
    ProviderDetailAPI,
    ProviderLocationUpdateAPI,
    ProviderProfileView,
    ProviderRequestListAPI,
    ProviderReviewListView,
    ProviderStopTrackingAPI,
    ProvidersByCategoryAPI,
    RejectServiceRequestAPI,
    SendMessageAPI,
    ServiceCategoryListAPI,
    SignupAPI,
    LoginAPI,
    LogoutAPI,
    ProfileAPI,
    ProviderRegistrationAPI,
    GenerateProviderEmailOTP,
    StartChatAPI,
    UpdateReviewView,
    UserRegisteredWebinarsAPI,
    UserReviewListView,
    VerifyProviderEmailOTP,
    ServiceRequestAPI,           # New: user creates a service request
    ProviderIncomingRequestsAPI, # New: provider views pending requests
    AcceptServiceRequestAPI,
    WebinarListAPI,
    WebinarPaymentInitAPI,
    WebinarRegisterAPI,
    WebinarRegistrationsAPI,
    WebinarSendLinkAPI,     # New: provider accepts a request
)
from doerapp import views


urlpatterns = [
    # 🔐 User Authentication
    path("api/signup/", SignupAPI.as_view(), name="api-signup"),
    path("api/login/", LoginAPI.as_view(), name="api-login"),
    path("api/logout/", LogoutAPI.as_view(), name="api-logout"),
    path("api/profile/", ProfileAPI.as_view(), name="api-profile"),

    # 🧑‍🔧 Provider Endpoints
    path("api/provider/register/", ProviderRegistrationAPI.as_view(), name="api-provider-register"),
    #path("api/provider/login/", ProviderLoginAPI.as_view(), name="api-provider-login"),
    path('api/provider/profile/', ProviderProfileView.as_view(), name='provider-profile'),
    path('api/provider/add-service/', AddServiceView.as_view(), name='provider-add-service'),
    path("api/provider/check-username/", CheckUsernameView.as_view()),

    # ✉️ Email OTP Verification
    path("api/provider/email-otp/generate/", GenerateProviderEmailOTP.as_view(), name="api-provider-email-otp-generate"),
    path("api/provider/verify-email-otp/", VerifyProviderEmailOTP.as_view(), name="api-provider-email-otp-verify"),
    path("api/providers/", ProvidersByCategoryAPI.as_view(), name="api-providers-by-category"),
    path("api/provider/<int:pk>/", ProviderDetailAPI.as_view(),name="api-provider-detail"),

    # 🧾 Service Categories
    path("api/provider/service-categories/", ServiceCategoryListAPI.as_view(), name="api-service-categories"),

    # 📌 Service Requests / Bookings
    path("api/service-requests/", ServiceRequestAPI.as_view(), name="api-service-requests"),  # user creates request
    path("api/provider/requests/", ProviderIncomingRequestsAPI.as_view(), name="api-provider-requests"),  # provider view
    path("api/provider/requests/<int:pk>/accept/", AcceptServiceRequestAPI.as_view(), name="api-accept-request"),  # accept request
    path("api/provider/requests/<int:pk>/reject/", RejectServiceRequestAPI.as_view(), name="api-reject-request"),  # reject request
    path("api/service-requests/<int:pk>/cancel/", CancelServiceRequestAPI.as_view(), name="cancel_service_request"), #cancel request
    path("api/providers/requests/", ProviderRequestListAPI.as_view(), name="provider-requests"),
    path('api/provider/requests/<int:pk>/complete/', MarkServiceCompletedView.as_view(), name='mark-service-completed'),
    path("api/service-requests/<int:pk>/status/",views.ServiceRequestStatusAPI.as_view(),name="service-request-status"),




    # Chatroom management
    path("api/chat/start/<int:service_request_id>/", GetOrCreateChatRoomAPI.as_view(), name="chatroom-start"),
    path("api/chat/start/", StartChatAPI.as_view(), name="chatroom-start-direct"),
    #chatroom message
    path("api/chat/<int:pk>/", ChatRoomDetailAPI.as_view(), name="chatroom-detail"),
    path("api/chat/<int:chatroom_id>/send/", SendMessageAPI.as_view(), name="chatroom-send"),


    # provider location
    path("api/provider/update-location/", ProviderLocationUpdateAPI.as_view(), name="provider-location-update"),
    path("api/provider/stop-tracking/", ProviderStopTrackingAPI.as_view(), name="provider-stop-tracking"),

    # Webinar
    # Provider
    path("api/provider/webinars/", views.ProviderWebinarAPI.as_view(), name="provider-webinars"),
    path("api/provider/dashboard/", views.ProviderWebinarDashboardAPI.as_view(), name="provider-dashboard"),
    path("api/provider/webinar/", views.ProviderOwnedWebinarsAPI.as_view(), name="provider-owned-webinars"),


    # Public
    path("api/webinars/", views.WebinarListAPI.as_view(), name="webinar-list"),
    path("api/webinars/<int:pk>/", views.WebinarDetailAPI.as_view(), name="webinar-detail"),

    # Payment & Registration
    path("api/webinars/<int:pk>/init-payment/", views.WebinarPaymentInitAPI.as_view(), name="webinar-payment-init"),
    path("api/webinars/<int:pk>/register/", views.WebinarRegisterAPI.as_view(), name="webinar-register"),
    path("api/webinars/<int:pk>/registrations/", views.WebinarRegistrationsAPI.as_view(), name="webinar-registrations"),
    path("api/webinars/<int:pk>/send-link/", views.WebinarSendLinkAPI.as_view(), name="webinar-send-link"),

    # User
    path("api/webinars/registered/", views.UserRegisteredWebinarsAPI.as_view(), name="user-registered-webinars"),

    #notification
    path('api/notifications/', NotificationListAPIView.as_view(),name='notification-list'),
    path('api/notifications/<int:pk>/read/',NotificationMarkReadAPIView.as_view(),name='notification-mark-read'),
    path('api/notifications/mark-all-read/',NotificationMarkAllReadAPIView.as_view(),name='notification-mark-all-read'),

    #Review
    path('api/review/create/', CreateServiceReviewView.as_view(), name='create-service-review'),
    path('api/review/provider/<int:provider_id>/', ProviderReviewListView.as_view(), name='provider-reviews'),
    path('api/review/user/<int:user_id>/', UserReviewListView.as_view(), name='user-reviews'),
    path('api/review/latest/', LatestReviewsView.as_view(), name='latest-reviews'),
    path("api/review/direct/create/", CreateDirectProviderReviewView.as_view()),
    path("review/<int:pk>/update/", UpdateReviewView.as_view()),
    path("review/<int:pk>/delete/", DeleteReviewView.as_view()),

    path("api/contact/", ContactMessageAPI.as_view(), name="contact-message"),
    
    # 🔑 JWT Auth
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
