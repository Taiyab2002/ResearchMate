from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    title = models.CharField(max_length=255)
    field = models.CharField(max_length=100, blank=True)
    abstract = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    keywords = models.CharField(max_length=255, blank=True)  # comma-separated for now
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