from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (Project, Paper, Note, UserProfile, Citation, Milestone,
    ResearchConversation, ResearchMessage, LiteratureMatrixEntry, ResearchTask,
    ResearchEvent, UploadedPaperFile)


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    class Meta:
        model = UserProfile
        fields = ['email','full_name','university','department','student_id','study_level','bio',
                  'email_notifications','research_tips','created_at','updated_at']
        read_only_fields = ['email','created_at','updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(required=False, allow_blank=True)
    university = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    class Meta:
        model = User
        fields = ['id','username','email','password','full_name','university','department']
    def create(self, validated_data):
        profile_data = {k: validated_data.pop(k, '') for k in ('full_name','university','department')}
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, **profile_data)
        return user


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id','owner','created_at']
    def validate_progress_percent(self, value):
        if not 0 <= value <= 100: raise serializers.ValidationError('Must be between 0 and 100.')
        return value


class PaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paper
        fields = '__all__'
        read_only_fields = ['id','created_at']
    def validate_project(self, project):
        if project.owner != self.context['request'].user:
            raise serializers.ValidationError("You cannot use another user's project.")
        return project


class NoteSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    class Meta:
        model = Note
        fields = '__all__'
        read_only_fields = ['id','owner','created_at','updated_at']
    def validate(self, attrs):
        user = self.context['request'].user
        project = attrs.get('project', getattr(self.instance,'project',None))
        paper = attrs.get('paper', getattr(self.instance,'paper',None))
        if project and project.owner != user: raise serializers.ValidationError('Project does not belong to you.')
        if paper and paper.project.owner != user: raise serializers.ValidationError('Paper does not belong to you.')
        if project and paper and paper.project_id != project.id: raise serializers.ValidationError('Paper must belong to the selected project.')
        return attrs


class CitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Citation
        fields = '__all__'
        read_only_fields = ['id','owner','rendered_citation','created_at']
    def validate(self, attrs):
        if not (attrs.get('title') or getattr(self.instance,'title','')):
            raise serializers.ValidationError({'title':'This field is required.'})
        source=(attrs.get('source_type') or getattr(self.instance,'source_type','article')).lower().replace(' ','_')
        authors=attrs.get('authors',getattr(self.instance,'authors',''))
        year=attrs.get('publication_year',getattr(self.instance,'publication_year',None))
        journal=attrs.get('journal',getattr(self.instance,'journal',''))
        publisher=attrs.get('publisher',getattr(self.instance,'publisher',''))
        url=attrs.get('url',getattr(self.instance,'url',''))
        errors={}
        if source in {'article','journal_article','journal'}:
            if not authors: errors['authors']='Authors are required for an article citation.'
            if not year: errors['publication_year']='Publication year is required for an article citation.'
            if not journal: errors['journal']='Journal is required for an article citation.'
        elif source in {'book'}:
            if not authors: errors['authors']='Authors are required for a book citation.'
            if not year: errors['publication_year']='Publication year is required for a book citation.'
            if not publisher: errors['publisher']='Publisher is required for a book citation.'
        elif source in {'website','webpage','web_page'}:
            if not url: errors['url']='URL is required for a website citation.'
        elif source in {'conference','conference_paper'}:
            if not authors: errors['authors']='Authors are required for a conference citation.'
            if not year: errors['publication_year']='Publication year is required for a conference citation.'
            if not (journal or publisher): errors['publisher']='Conference or publisher name is required.'
        if errors: raise serializers.ValidationError(errors)
        return attrs


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = '__all__'
        read_only_fields = ['id','completed_at','created_at','updated_at']
    def validate_project(self, project):
        if project.owner_id != self.context['request'].user.id: raise serializers.ValidationError('Project does not belong to you.')
        return project


class ResearchMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchMessage
        fields = ['id','role','content','evidence','created_at']
        read_only_fields = ['id','created_at']

class ResearchConversationSerializer(serializers.ModelSerializer):
    messages = ResearchMessageSerializer(many=True, read_only=True)
    paper_ids = serializers.PrimaryKeyRelatedField(source='papers', many=True, queryset=Paper.objects.all(), required=False, write_only=True)
    class Meta:
        model = ResearchConversation
        fields = ['id','title','paper_ids','messages','created_at','updated_at']
        read_only_fields = ['id','messages','created_at','updated_at']
    def validate_paper_ids(self, papers):
        user=self.context['request'].user
        if any(p.project.owner_id != user.id for p in papers): raise serializers.ValidationError('All papers must belong to you.')
        return papers


class LiteratureMatrixEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LiteratureMatrixEntry
        fields = '__all__'
        read_only_fields = ['id','owner','created_at','updated_at']
    def validate(self, attrs):
        user=self.context['request'].user
        paper=attrs.get('paper', getattr(self.instance,'paper',None))
        project=attrs.get('project', getattr(self.instance,'project',None))
        if paper and paper.project.owner_id != user.id: raise serializers.ValidationError({'paper':'Paper does not belong to you.'})
        if project and project.owner_id != user.id: raise serializers.ValidationError({'project':'Project does not belong to you.'})
        if paper and project and paper.project_id != project.id: raise serializers.ValidationError('Paper must belong to the selected project.')
        return attrs


class ResearchTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchTask
        fields = '__all__'
        read_only_fields = ['id','owner','created_at','updated_at']
    def validate_project(self, project):
        if project and project.owner_id != self.context['request'].user.id: raise serializers.ValidationError('Project does not belong to you.')
        return project


class ResearchEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchEvent
        fields = '__all__'
        read_only_fields = ['id','owner','created_at','updated_at','reminder_sent_at']
    def validate_project(self, project):
        if project and project.owner_id != self.context['request'].user.id: raise serializers.ValidationError('Project does not belong to you.')
        return project


class UploadedPaperFileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    download_url = serializers.SerializerMethodField()
    class Meta:
        model = UploadedPaperFile
        fields = ['id','project','paper','file','download_url','original_filename','processing_status','created_at']
        read_only_fields = ['id','download_url','original_filename','processing_status','created_at']
    def get_download_url(self, obj):
        request = self.context.get('request')
        from rest_framework.reverse import reverse
        return reverse('paper-upload-download', kwargs={'pk': obj.pk}, request=request)
    def validate(self, attrs):
        user=self.context['request'].user
        project=attrs.get('project')
        paper=attrs.get('paper')
        if project and project.owner_id != user.id: raise serializers.ValidationError({'project':'Project does not belong to you.'})
        if paper and paper.project.owner_id != user.id: raise serializers.ValidationError({'paper':'Paper does not belong to you.'})
        if project and paper and paper.project_id != project.id: raise serializers.ValidationError('Paper must belong to the selected project.')
        return attrs
