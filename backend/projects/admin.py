from django.contrib import admin
from .models import Project, Paper, Note


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'field', 'owner', 'progress_percent', 'created_at')
    search_fields = ('title', 'field', 'keywords')
    list_filter = ('field', 'created_at')


@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'authors', 'year', 'project', 'bookmarked')
    search_fields = ('title', 'authors', 'journal')
    list_filter = ('year', 'bookmarked')


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'note_type', 'owner', 'project', 'created_at')
    search_fields = ('title', 'content')
    list_filter = ('note_type', 'created_at')