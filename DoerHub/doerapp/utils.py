import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_broadcast_notification(message, extra_data=None):
    """
    Send broadcast notification WITHOUT importing models.
    We build the payload manually.
    """
    payload = {
        "id": None, 
        "type": "broadcast",
        "message": message,
        "recipient": None,
        "is_read": False,
        "extra_data": extra_data or {},
        "created_at": None,
    }

    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "notifications",
            {
                "type": "notification.message",
                "text": json.dumps(payload),
            }
        )
    else:
        print("Channel layer not available. Broadcast skipped.")

    return payload