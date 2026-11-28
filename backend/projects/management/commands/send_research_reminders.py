from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from projects.models import ResearchEvent


class Command(BaseCommand):
    help = 'Send due ResearchMate event reminders to users with email notifications enabled.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='List due reminders without sending or marking them sent.')

    def handle(self, *args, **options):
        now = timezone.now()
        events = ResearchEvent.objects.filter(
            status='upcoming', reminder_at__lte=now, reminder_sent_at__isnull=True,
            owner__profile__email_notifications=True,
        ).select_related('owner', 'project').order_by('reminder_at')
        count = 0
        for event in events:
            recipient = (event.owner.email or '').strip()
            if not recipient:
                self.stdout.write(self.style.WARNING(f'Skipped event {event.pk}: account has no email.'))
                continue
            subject = f'ResearchMate reminder: {event.title}'
            due = timezone.localtime(event.due_at).strftime('%Y-%m-%d %H:%M')
            project = f'\nProject: {event.project.title}' if event.project else ''
            body = f'Hello {event.owner.get_username()},\n\nReminder: {event.title}\nDue: {due}{project}\n\n{event.description}\n\nResearchMate'
            if options['dry_run']:
                self.stdout.write(f'DRY RUN: would email {recipient} for event {event.pk}')
                count += 1
                continue
            try:
                sent = send_mail(subject, body, None, [recipient], fail_silently=False)
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f'Failed event {event.pk}: {exc.__class__.__name__}'))
                continue
            if sent:
                event.reminder_sent_at = now
                event.save(update_fields=['reminder_sent_at', 'updated_at'])
                count += 1
        self.stdout.write(self.style.SUCCESS(f'{"Would send" if options["dry_run"] else "Sent"} {count} reminder(s).'))
