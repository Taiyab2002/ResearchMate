from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('projects', '0005_userprofile_bio_userprofile_email_notifications_and_more')]
    operations = [
        migrations.AddField(
            model_name='researchevent',
            name='reminder_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
