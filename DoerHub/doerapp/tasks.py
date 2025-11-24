from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

@shared_task
def send_contact_email(name, email, message):
    subject = "New Contact Message"
    body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"

    send_mail(
        subject,
        body,
        "doer.hub7@gmail.com",   # From
        ["doer.hub7@gmail.com"], # To
        fail_silently=False,
    )

    return "Email sent successfully"



@shared_task
def send_webinar_links_task(subject, message_template, meeting_url, provider_name, registration_data):
    sent_to = []

    for reg in registration_data:
        name = reg["name"]
        email = reg["email"]

        personalized_msg = message_template.replace("{{name}}", name)

        send_mail(
            subject=subject,
            message=personalized_msg,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        sent_to.append(email)

    return sent_to

@shared_task
def send_otp_email_task(email, otp):
    subject = "DoerHub OTP"
    message = f"Your OTP: {otp}\nValid for 10 mins."

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )

    return "OTP sent"


@shared_task
def send_provider_approval_email(username, email):
    subject = "Provider Approval Notification"
    message = (
        f"Dear {username},\n\n"
        "Your provider profile has been approved! "
        "You can now log in and start offering services."
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return "Approval email sent"


@shared_task
def send_provider_rejection_email(username, email, reason):
    subject = "Provider Rejection Notification"
    message = (
        f"Dear {username},\n\n"
        f"Your provider profile was not approved.\n"
        f"Reason: {reason}"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return "Rejection email sent"
