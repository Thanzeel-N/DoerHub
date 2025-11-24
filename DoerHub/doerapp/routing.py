from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/requests/provider/(?P<provider_id>\d+)/$", consumers.ProviderRequestConsumer.as_asgi()),
    # re_path(r"ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
    re_path(r"ws/chat/(?P<chatroom_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/requests/user/(?P<user_id>\d+)/$', consumers.UserRequestConsumer.as_asgi()),
    re_path(r"ws/service-request/(?P<request_id>\d+)/$", consumers.ServiceRequestConsumer.as_asgi()),
]
