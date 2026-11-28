from datetime import timedelta
from io import StringIO
from django.contrib.auth.models import User
from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status


class ResearchMateAPITests(APITestCase):
    def setUp(self):
        self.user=User.objects.create_user(username='apiuser',password='StrongPass123',email='api@example.com')
        self.other=User.objects.create_user(username='otheruser',password='StrongPass123')
        response=self.client.post('/api/login/',{'username':'apiuser','password':'StrongPass123'},format='json')
        self.refresh=response.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer '+response.data['access'])

    def test_profile_extensions_can_be_saved(self):
        response=self.client.patch('/api/profile/',{'student_id':'ST-01','study_level':'Undergraduate','bio':'Research learner','research_tips':False},format='json')
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        self.assertEqual(response.data['student_id'],'ST-01')
        self.assertFalse(response.data['research_tips'])

    def test_project_data_is_user_scoped(self):
        project=self.client.post('/api/projects/',{'title':'My project'},format='json')
        self.assertEqual(project.status_code,status.HTTP_201_CREATED)
        self.assertEqual(len(self.client.get('/api/projects/').data),1)
        self.client.credentials()
        other_login=self.client.post('/api/login/',{'username':'otheruser','password':'StrongPass123'},format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer '+other_login.data['access'])
        self.assertEqual(len(self.client.get('/api/projects/').data),0)

    def test_milestones_update_project_progress(self):
        project=self.client.post('/api/projects/',{'title':'Milestone project'},format='json').data
        response=self.client.post('/api/milestones/',{'project':project['id'],'title':'Complete','status':'completed'},format='json')
        self.assertEqual(response.status_code,status.HTTP_201_CREATED)
        self.assertEqual(self.client.get(f"/api/projects/{project['id']}/").data['progress_percent'],100)

    def test_citation_is_rendered_and_saved(self):
        response=self.client.post('/api/citations/',{'style':'APA','title':'Example paper','authors':'A. Author','publication_year':2024,'journal':'Example Journal'},format='json')
        self.assertEqual(response.status_code,status.HTTP_201_CREATED)
        self.assertIn('Example paper',response.data['rendered_citation'])

    def test_logout_blacklists_refresh_token(self):
        response=self.client.post('/api/logout/',{'refresh':self.refresh},format='json')
        self.assertEqual(response.status_code,status.HTTP_205_RESET_CONTENT)
        refresh_response=self.client.post('/api/token/refresh/',{'refresh':self.refresh},format='json')
        self.assertEqual(refresh_response.status_code,status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotation_blacklists_previous_refresh(self):
        response=self.client.post('/api/token/refresh/',{'refresh':self.refresh},format='json')
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        self.assertNotEqual(response.data['refresh'],self.refresh)
        old_refresh=self.client.post('/api/token/refresh/',{'refresh':self.refresh},format='json')
        self.assertEqual(old_refresh.status_code,status.HTTP_401_UNAUTHORIZED)

    def test_ask_papers_returns_owned_paper_evidence(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import Project, Paper, ResearchConversation, UploadedPaperFile
        project=Project.objects.create(owner=self.user,title='Evidence project')
        paper=Paper.objects.create(project=project,title='Climate study',authors='Researcher',year=2025)
        uploaded=UploadedPaperFile.objects.create(owner=self.user,paper=paper,project=project,
            file=SimpleUploadedFile('sample.pdf',b'%PDF-1.4\n%%EOF',content_type='application/pdf'),
            original_filename='sample.pdf',extracted_text='The climate model achieved improved prediction accuracy. It was tested on a regional dataset.')
        conversation=ResearchConversation.objects.create(owner=self.user,title='Paper chat')
        conversation.papers.add(paper)
        response=self.client.post(f'/api/conversations/{conversation.id}/ask/',{'question':'What accuracy did the climate model achieve?'},format='json')
        self.assertEqual(response.status_code,status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'],'assistant')
        self.assertTrue(response.data['evidence'])
        uploaded.file.delete(save=False)


    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_due_reminder_sends_once_and_records_sent_time(self):
        from .models import UserProfile, ResearchEvent
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.email_notifications = True
        profile.save(update_fields=['email_notifications'])
        now = timezone.now()
        event = ResearchEvent.objects.create(
            owner=self.user,
            title='Research deadline',
            due_at=now + timedelta(hours=2),
            reminder_at=now - timedelta(minutes=1),
        )
        output = StringIO()
        call_command('send_research_reminders', stdout=output)
        event.refresh_from_db()
        self.assertIsNotNone(event.reminder_sent_at)
        self.assertEqual(len(mail.outbox), 1)
        call_command('send_research_reminders', stdout=StringIO())
        self.assertEqual(len(mail.outbox), 1)

    def test_pdf_upload_is_downloaded_only_through_authenticated_owner_route(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload=SimpleUploadedFile('secure-sample.pdf',b'%PDF-1.4\n%%EOF',content_type='application/pdf')
        response=self.client.post('/api/uploads/',{'file':upload},format='multipart')
        self.assertEqual(response.status_code,status.HTTP_201_CREATED)
        self.assertIn('/api/uploads/',response.data['download_url'])
        download=self.client.get(response.data['download_url'])
        self.assertEqual(download.status_code,status.HTTP_200_OK)
        self.assertEqual(download['Content-Type'],'application/pdf')
        delete=self.client.delete(f"/api/uploads/{response.data['id']}/")
        self.assertEqual(delete.status_code,status.HTTP_204_NO_CONTENT)
