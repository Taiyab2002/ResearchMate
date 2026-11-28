from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    title = models.CharField(max_length=255)
    field = models.CharField(max_length=100, blank=True)
    abstract = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    keywords = models.CharField(max_length=255, blank=True)
    progress_percent = models.IntegerField(default=0)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Paper(models.Model):
    title = models.CharField(max_length=255)
    authors = models.CharField(max_length=255)
    year = models.IntegerField()
    journal = models.CharField(max_length=255, blank=True)
    keywords = models.CharField(max_length=255, blank=True)
    bookmarked = models.BooleanField(default=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="papers")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Note(models.Model):
    NOTE_TYPES = [('general', 'General'), ('paper', 'Paper'), ('project', 'Project')]
    title = models.CharField(max_length=255)
    content = models.TextField()
    note_type = models.CharField(max_length=20, choices=NOTE_TYPES, default='general')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='research_notes')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    paper = models.ForeignKey(Paper, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=150, blank=True)
    university = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=150, blank=True)
    student_id = models.CharField(max_length=100, blank=True)
    study_level = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    email_notifications = models.BooleanField(default=True)
    research_tips = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name or self.user.username


class Citation(models.Model):
    CITATION_STYLES = [('APA', 'APA'), ('MLA', 'MLA'), ('IEEE', 'IEEE')]
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='citations')
    citation_type = models.CharField(max_length=30, blank=True)
    style = models.CharField(max_length=10, choices=CITATION_STYLES, default='APA')
    source_type = models.CharField(max_length=50, default='article')
    title = models.CharField(max_length=500)
    authors = models.TextField(blank=True)
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    journal = models.CharField(max_length=255, blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    doi = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=1000, blank=True)
    volume = models.CharField(max_length=50, blank=True)
    issue = models.CharField(max_length=50, blank=True)
    pages = models.CharField(max_length=100, blank=True)
    access_date = models.DateField(null=True, blank=True)
    rendered_citation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Milestone(models.Model):
    STATUS_CHOICES = [('pending','Pending'), ('in_progress','In progress'), ('completed','Completed')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    target_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    sequence = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return self.title


class ResearchConversation(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='research_conversations')
    title = models.CharField(max_length=255, default='Ask Your Papers')
    papers = models.ManyToManyField(Paper, blank=True, related_name='research_conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ResearchMessage(models.Model):
    ROLE_CHOICES = [('user','User'), ('assistant','Assistant')]
    conversation = models.ForeignKey(ResearchConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    evidence = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LiteratureMatrixEntry(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='literature_matrix_entries')
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='matrix_entries')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='matrix_entries')
    research_question = models.TextField(blank=True)
    methodology = models.TextField(blank=True)
    dataset_sample = models.TextField(blank=True)
    key_findings = models.TextField(blank=True)
    limitations = models.TextField(blank=True)
    research_gap = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ResearchTask(models.Model):
    STATUS_CHOICES = [('todo','To do'), ('in_progress','In progress'), ('done','Done')]
    PRIORITY_CHOICES = [('low','Low'), ('medium','Medium'), ('high','High')]
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='research_tasks')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ResearchEvent(models.Model):
    STATUS_CHOICES = [('upcoming','Upcoming'), ('completed','Completed'), ('cancelled','Cancelled')]
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='research_events')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_at = models.DateTimeField()
    reminder_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class UploadedPaperFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_paper_files')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_files')
    paper = models.ForeignKey(Paper, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_files')
    file = models.FileField(upload_to='research_pdfs/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    extracted_text = models.TextField(blank=True)
    processing_status = models.CharField(max_length=30, default='uploaded')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.original_filename
