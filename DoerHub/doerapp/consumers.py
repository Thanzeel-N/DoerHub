import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Provider, ChatRoom, Message, Notification

User = get_user_model()

# ============================================================================
# 🔧 Utility functions
# ============================================================================

@database_sync_to_async
def _validate_jwt_and_get_user(token: str):
    """Validate SimpleJWT token and return user instance."""
    try:
        if not token:
            return None
        token = token.strip()
        if token.lower().startswith("bearer "):
            token = token.split(" ", 1)[1].strip()

        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        return user
    except (InvalidToken, TokenError, Exception) as exc:
        print("JWT validation failed:", exc)
        return None


@database_sync_to_async
def _provider_exists_for_user(user, provider_id):
    try:
        return Provider.objects.filter(user=user, id=provider_id).exists()
    except Exception:
        return False


@database_sync_to_async
def _set_provider_online(provider_id, is_online: bool):
    try:
        p = Provider.objects.get(id=provider_id)
        p.is_online = is_online
        p.save(update_fields=["is_online"])
    except Provider.DoesNotExist:
        pass


@database_sync_to_async
def _get_chatroom(chatroom_id):
    try:
        return ChatRoom.objects.get(pk=chatroom_id)
    except ChatRoom.DoesNotExist:
        return None


@database_sync_to_async
def _save_chat_message(chatroom_id, user, content):
    chatroom = ChatRoom.objects.get(pk=chatroom_id)
    msg = Message.objects.create(chatroom=chatroom, sender=user, content=content)
    return {
        "content": msg.content,
        "sender_name": user.username,
        "timestamp": msg.timestamp.isoformat(),
    }


@database_sync_to_async
def _create_notification(sender, recipient, message, extra_data=None, notif_type="chat"):
    Notification.objects.create(
        type=notif_type,
        message=message[:100],
        recipient=recipient,
        extra_data=(extra_data or {}),
        is_read=False,
    )


@database_sync_to_async
def _get_chat_history(chatroom_id, limit=50):
    """Fetch last <limit> messages from DB."""
    try:
        chat = ChatRoom.objects.get(pk=chatroom_id)
        messages = Message.objects.filter(chatroom=chat).order_by("-timestamp")[:limit]
        # Reverse order (oldest first)
        return [
            {
                "sender": msg.sender.username,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in reversed(messages)
        ]
    except ChatRoom.DoesNotExist:
        return []


# ============================================================================
# 🟢 ProviderRequestConsumer
# ============================================================================

class ProviderRequestConsumer(AsyncJsonWebsocketConsumer):
    """Handles provider-side socket: new requests, notifications, etc."""

    async def connect(self):
        self.provider_id = self.scope["url_route"]["kwargs"].get("provider_id")
        if not self.provider_id:
            print("❌ Missing provider_id in URL")
            await self.close(code=4003)
            return

        params = parse_qs(self.scope.get("query_string", b"").decode())
        token = params.get("token", [None])[0]
        if not token:
            print("❌ No token in query")
            await self.close(code=4003)
            return

        # validate JWT
        user = await _validate_jwt_and_get_user(token)
        if not user:
            print(f"❌ Invalid token for provider {self.provider_id}")
            await self.close(code=4003)
            return

        # check ownership
        owns = await _provider_exists_for_user(user, self.provider_id)
        if not owns:
            print(f"❌ User {user.id} not owner of provider {self.provider_id}")
            await self.close(code=4003)
            return

        # join groups
        self.group_request = f"provider_{self.provider_id}"
        self.group_notify = f"provider_notify_{self.provider_id}"
        await self.channel_layer.group_add(self.group_request, self.channel_name)
        await self.channel_layer.group_add(self.group_notify, self.channel_name)

        await self.accept()
        await _set_provider_online(self.provider_id, True)

        print(f"✅ Provider {self.provider_id} connected (user {user.id})")

        await self.send_json({
            "type": "connected",
            "message": f"Provider {self.provider_id} online"
        })

    async def disconnect(self, close_code):
        print(f"⚠️ Provider {self.provider_id} disconnected, code={close_code}")
        try:
            await _set_provider_online(self.provider_id, False)
            await self.channel_layer.group_discard(self.group_request, self.channel_name)
            await self.channel_layer.group_discard(self.group_notify, self.channel_name)
        except Exception:
            pass

    async def new_request(self, event):
        """Broadcast new service requests to provider."""
        await self.send_json({
            "type": "new_request",
            "request_id": event.get("request_id"),
            "service_category": event.get("service_category"),
            "message": event.get("message"),
        })

    async def new_chat_notification(self, event):
        """Receive new chat notification from ChatConsumer."""
        await self.send_json({
            "type": "new_chat_notification",
            "chatroom_id": event.get("chatroom_id"),
            "message": event.get("message"),
            "sender": event.get("sender"),
        })


# ============================================================================
# 💬 ChatConsumer
# ============================================================================
class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Handles chat between user and provider."""

    async def connect(self):
        self.chatroom_id = self.scope["url_route"]["kwargs"].get("chatroom_id")
        if not self.chatroom_id:
            await self.close()
            return

        params = parse_qs(self.scope.get("query_string", b"").decode())
        token = params.get("token", [None])[0]
        self.user = await _validate_jwt_and_get_user(token)

        if not self.user:
            print("❌ Chat connect rejected: invalid/missing token")
            await self.close()
            return

        # async-safe check (no direct ORM access here)
        allowed = await self._user_allowed_in_chat(self.user.id, self.chatroom_id)
        if not allowed:
            print(f"❌ User {self.user.id} not allowed in chat {self.chatroom_id}")
            await self.close()
            return

        self.group_name = f"chat_{self.chatroom_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print(f"✅ Chat connected: user {self.user.id} in room {self.chatroom_id}")

        # Send chat history (uses async-safe helper)
        history = await _get_chat_history(self.chatroom_id)
        await self.send_json({"type": "chat_history", "messages": history})

        # Connection confirmation
        await self.send_json({
            "type": "connection_established",
            "message": f"Connected to chat {self.chatroom_id}"
        })

    @database_sync_to_async
    def _user_allowed_in_chat(self, user_id, chatroom_id):
        """
        Return True if user_id is either chat.user or chat.provider.
        Use select_related to avoid extra queries.
        """
        try:
            chatroom = ChatRoom.objects.select_related("user", "provider").get(pk=chatroom_id)
            # compare by id to avoid lazy FK evaluation in async context
            user_is_user = getattr(chatroom.user, "id", None) == int(user_id)
            provider_obj = getattr(chatroom, "provider", None)
            # provider could be a User or Provider instance depending on your model
            provider_id = None
            if provider_obj is not None:
                provider_id = getattr(provider_obj, "id", None)
            user_is_provider = provider_id == int(user_id)
            return user_is_user or user_is_provider
        except ChatRoom.DoesNotExist:
            return False

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print(f"⚠️ Chat disconnected (room {self.chatroom_id})")

    async def receive_json(self, content):
        message_text = (content.get("message") or "").strip()
        if not message_text:
            return

        # 1️⃣ Save message (this is async-safe; _save_chat_message is a db helper)
        saved = await _save_chat_message(self.chatroom_id, self.user, message_text)

        # 2️⃣ Broadcast to chat group (async)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message": saved["content"],
                "sender": saved["sender_name"],
                "timestamp": saved["timestamp"],
            },
        )

        # 3️⃣ Notify recipient (async-safe helper returns recipient user id)
        recipient_user_id = await self._get_recipient_user_id(self.user.id, self.chatroom_id)
        if recipient_user_id and recipient_user_id != self.user.id:
            # create notification via async-safe DB helper (works with ids)
            await self._create_notification_by_ids(
                sender_id=self.user.id,
                recipient_id=recipient_user_id,
                message=message_text,
                extra_data={"sender": self.user.username, "chatroom_id": self.chatroom_id},
                notif_type="chat",
            )

        # 4️⃣ Notify provider dashboard if applicable (async-safe)
        provider_id = await self._get_provider_id_for_chat(self.chatroom_id)
        if provider_id:
            await self.channel_layer.group_send(
                f"provider_notify_{provider_id}",
                {
                    "type": "new_chat_notification",
                    "chatroom_id": self.chatroom_id,
                    "message": saved["content"],
                    "sender": saved["sender_name"],
                },
            )

    async def chat_message(self, event):
        await self.send_json({
            "type": "chat_message",
            "message": event["message"],
            "sender": event["sender"],
            "timestamp": event["timestamp"],
        })

    # ----------------- Async-safe DB helpers used by this consumer -----------------

    @database_sync_to_async
    def _get_recipient_user_id(self, sender_id, chatroom_id):
        """
        Return the user id of the recipient (the OTHER participant).
        This returns a plain integer (or None), so no ORM access happens on the async side.
        """
        try:
            chat = ChatRoom.objects.select_related("user", "provider").get(pk=chatroom_id)
            user_obj = getattr(chat, "user", None)
            provider_obj = getattr(chat, "provider", None)

            # Compare by id (be defensive if provider_obj is a Provider model or User)
            if user_obj and getattr(user_obj, "id", None) == int(sender_id):
                # sender is chat.user -> recipient is provider
                # provider_obj might be Provider or User. If Provider, return its user id if linked,
                # otherwise return provider_obj.id (if it's a User).
                # Try common patterns:
                if provider_obj is None:
                    return None
                # If provider_obj is a Provider model that links to user via provider_obj.user:
                if hasattr(provider_obj, "user"):
                    return getattr(provider_obj.user, "id", None)
                return getattr(provider_obj, "id", None)

            elif provider_obj and getattr(provider_obj, "id", None) == int(sender_id):
                # sender is provider (provider_obj is probably a Provider instance)
                # recipient is chat.user
                return getattr(user_obj, "id", None)

            # fallback: check if chat.provider is a User instance (not Provider)
            if provider_obj and getattr(provider_obj, "id", None) == int(sender_id):
                return getattr(user_obj, "id", None)

            return None
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def _create_notification_by_ids(self, sender_id, recipient_id, message, extra_data=None, notif_type="chat"):
        """
        Create a Notification given sender and recipient user IDs.
        We fetch User objects inside this sync function and create the Notification record.
        """
        try:
            sender_user = User.objects.get(id=sender_id)
            recipient_user = User.objects.get(id=recipient_id)
            Notification.objects.create(
                type=notif_type,
                message=message[:100],
                recipient=recipient_user,
                extra_data=(extra_data or {}),
                is_read=False,
            )
        except Exception as exc:
            # swallow to avoid crashing the consumer; log if needed
            print("⚠️ _create_notification_by_ids error:", exc)

    @database_sync_to_async
    def _get_provider_id_for_chat(self, chatroom_id):
        """
        Return provider.id (the Provider model id) for this chatroom, if any.
        Tries to handle cases where chat.provider might be a User or Provider.
        """
        try:
            chat = ChatRoom.objects.select_related("provider").get(pk=chatroom_id)
            provider_obj = getattr(chat, "provider", None)
            if provider_obj is None:
                return None

            # If provider_obj is a Provider model instance with an 'id' attribute:
            if provider_obj.__class__.__name__.lower() == "provider":
                return getattr(provider_obj, "id", None)

            # If provider_obj is a User instance, try to find Provider model linked to it.
            try:
                prov = Provider.objects.filter(user=provider_obj).first()
                return getattr(prov, "id", None) if prov else None
            except Exception:
                return None
        except ChatRoom.DoesNotExist:
            return None

# ============================================================================
# 👤 UserRequestConsumer (unchanged)
# ============================================================================

class UserRequestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"].get("user_id")
        if not self.user_id:
            await self.close()
            return
        self.room_group_name = f"user_{self.user_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        await self.send_json({"message": "Received!", "content": content})

    async def send_update(self, event):
        await self.send_json(event.get("data", {}))



class ServiceRequestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.request_id = self.scope['url_route']['kwargs']['request_id']
        self.group_name = f"request_{self.request_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def request_accepted(self, event):
        await self.send(text_data=json.dumps({
            "type": "request.accepted",
            "chatroom_id": event["chatroom_id"]
        }))

    async def request_rejected(self, event):
        await self.send(text_data=json.dumps({
            "type": "request.rejected"
        }))
