import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import date
from pathlib import Path

from django.db.models import Q
from django.utils import timezone
from django.http import FileResponse
from rest_framework import generics, viewsets, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .ai_provider import AIProviderError, chat as ai_chat, is_configured as ai_is_configured
from .models import (Project, Paper, Note, UserProfile, Citation, Milestone,
    ResearchConversation, ResearchMessage, LiteratureMatrixEntry, ResearchTask,
    ResearchEvent, UploadedPaperFile)
from .serializers import (RegisterSerializer, UserProfileSerializer, ProjectSerializer,
    PaperSerializer, NoteSerializer, CitationSerializer, MilestoneSerializer,
    ResearchConversationSerializer, LiteratureMatrixEntrySerializer,
    ResearchTaskSerializer, ResearchEventSerializer, UploadedPaperFileSerializer, ResearchMessageSerializer)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        token = request.data.get('refresh')
        if not token: return Response({'detail':'refresh token is required.'}, status=400)
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            return Response({'detail':'Invalid or expired refresh token.'}, status=401)
        return Response({'detail':'Logged out.'}, status=205)


class OwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]


class ProjectViewSet(OwnedModelViewSet):
    serializer_class = ProjectSerializer
    def get_queryset(self): return Project.objects.filter(owner=self.request.user).order_by('-created_at')
    def perform_create(self, serializer): serializer.save(owner=self.request.user)


class PaperViewSet(OwnedModelViewSet):
    serializer_class = PaperSerializer
    def get_queryset(self): return Paper.objects.filter(project__owner=self.request.user).order_by('-created_at')


class NoteViewSet(OwnedModelViewSet):
    serializer_class = NoteSerializer
    def get_queryset(self): return Note.objects.filter(owner=self.request.user).order_by('-created_at')
    def perform_create(self, serializer): serializer.save(owner=self.request.user)


def render_citation(obj):
    authors = [a.strip() for a in re.split(r';|\band\b', obj.authors or '') if a.strip()]
    author_text = ', '.join(authors) if authors else 'Unknown author'
    year = str(obj.publication_year) if obj.publication_year else 'n.d.'
    title = obj.title.strip()
    source = obj.journal or obj.publisher
    doi_or_url = ('https://doi.org/' + obj.doi) if obj.doi and not obj.doi.startswith('http') else (obj.doi or obj.url)
    if obj.style == 'MLA':
        result = f'{author_text}. "{title}." {source}, {year}.'
    elif obj.style == 'IEEE':
        result = f'{author_text}, "{title}," {source}, {year}.'
    else:
        result = f'{author_text} ({year}). {title}. {source}.'
    if obj.volume: result += f' {obj.volume}'
    if obj.issue: result += f'({obj.issue})'
    if obj.pages: result += f', pp. {obj.pages}'
    if doi_or_url: result += f' {doi_or_url}'
    if obj.access_date: result += f' Accessed {obj.access_date}.'
    return result.strip()


class CitationViewSet(OwnedModelViewSet):
    serializer_class = CitationSerializer
    def get_queryset(self): return Citation.objects.filter(owner=self.request.user).order_by('-created_at')
    def perform_create(self, serializer):
        item=serializer.save(owner=self.request.user)
        item.rendered_citation=render_citation(item)
        item.save(update_fields=['rendered_citation'])
    def perform_update(self, serializer):
        item=serializer.save()
        item.rendered_citation=render_citation(item)
        item.save(update_fields=['rendered_citation'])


class MilestoneViewSet(OwnedModelViewSet):
    serializer_class = MilestoneSerializer
    def get_queryset(self): return Milestone.objects.filter(project__owner=self.request.user).order_by('sequence','id')
    def _sync(self, project):
        total=project.milestones.count()
        project.progress_percent=round(project.milestones.filter(status='completed').count()*100/total) if total else 0
        project.save(update_fields=['progress_percent'])
    def perform_create(self, serializer):
        obj=serializer.save()
        if obj.status == 'completed' and not obj.completed_at:
            obj.completed_at=timezone.now(); obj.save(update_fields=['completed_at'])
        self._sync(obj.project)
    def perform_update(self, serializer):
        obj=serializer.save()
        obj.completed_at=timezone.now() if obj.status=='completed' else None
        obj.save(update_fields=['completed_at'])
        self._sync(obj.project)
    def perform_destroy(self, instance):
        project=instance.project
        instance.delete(); self._sync(project)


class ResearchConversationViewSet(OwnedModelViewSet):
    serializer_class = ResearchConversationSerializer
    def get_queryset(self): return ResearchConversation.objects.filter(owner=self.request.user).prefetch_related('messages','papers').order_by('-updated_at')
    def perform_create(self, serializer): serializer.save(owner=self.request.user)
    @action(detail=True, methods=['post'])
    def ask(self, request, pk=None):
        conversation=self.get_object()
        question=(request.data.get('question') or '').strip()
        if not question: return Response({'detail':'question is required.'}, status=400)
        if len(question)>5000: return Response({'detail':'question is too long (max 5000 characters).'}, status=400)
        ResearchMessage.objects.create(conversation=conversation, role='user', content=question)
        papers=conversation.papers.filter(project__owner=request.user)
        terms={w.lower() for w in re.findall(r'[A-Za-z0-9]{4,}', question)}
        evidences=[]
        for paper in papers:
            for file_obj in paper.uploaded_files.filter(owner=request.user):
                text=file_obj.extracted_text or ''
                if text:
                    chunks=[s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
                    ranked=sorted(chunks, key=lambda s: sum(t in s.lower() for t in terms), reverse=True)
                    for chunk in ranked[:2]:
                        if any(t in chunk.lower() for t in terms):
                            evidences.append({'paper_id':paper.id,'paper_title':paper.title,'excerpt':chunk[:900]})
        if evidences and ai_is_configured():
            context='\n\n'.join(f"Paper: {e['paper_title']} (paper_id={e['paper_id']})\nExcerpt: {e['excerpt']}" for e in evidences)[:16000]
            try:
                answer=ai_chat(
                    f"Answer the question using ONLY the supplied paper excerpts. If evidence is insufficient, say so. Do not invent citations.\nQuestion: {question}\n\nExcerpts:\n{context}",
                    system='You are an academic research assistant. Ground every claim in the provided excerpts and clearly state uncertainty.'
                )
                answer_method='configured_ai_with_excerpts'
            except AIProviderError as exc:
                return Response({'detail':str(exc)},status=503)
        elif evidences:
            answer='I found these relevant excerpts in your selected uploaded papers. Review them as evidence. Configure AI_API_KEY and AI_MODEL to enable grounded AI answers.'
            answer_method='local_excerpt_matching'
        else:
            answer='I could not find matching text in the selected papers. Upload a text-extractable PDF and select its paper.'
            answer_method='local_excerpt_matching'
        msg=ResearchMessage.objects.create(conversation=conversation, role='assistant', content=answer, evidence=evidences)
        result=ResearchMessageSerializer(msg).data
        result['method']=answer_method
        return Response(result, status=201)


class LiteratureMatrixEntryViewSet(OwnedModelViewSet):
    serializer_class = LiteratureMatrixEntrySerializer
    def get_queryset(self): return LiteratureMatrixEntry.objects.filter(owner=self.request.user).order_by('-updated_at')
    def perform_create(self, serializer): serializer.save(owner=self.request.user)


class ResearchTaskViewSet(OwnedModelViewSet):
    serializer_class = ResearchTaskSerializer
    def get_queryset(self):
        qs=ResearchTask.objects.filter(owner=self.request.user).order_by('-updated_at')
        project_id=self.request.query_params.get('project')
        return qs.filter(project_id=project_id) if project_id else qs
    def perform_create(self, serializer): serializer.save(owner=self.request.user)


class ResearchEventViewSet(OwnedModelViewSet):
    serializer_class = ResearchEventSerializer
    def get_queryset(self): return ResearchEvent.objects.filter(owner=self.request.user).order_by('due_at')
    def perform_create(self, serializer): serializer.save(owner=self.request.user)


class PDFUploadViewSet(OwnedModelViewSet):
    serializer_class = UploadedPaperFileSerializer
    def get_queryset(self): return UploadedPaperFile.objects.filter(owner=self.request.user).order_by('-created_at')
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        obj=self.get_object()
        try:
            file_handle=obj.file.open('rb')
        except (FileNotFoundError, OSError):
            return Response({'detail':'Stored PDF file is unavailable.'}, status=404)
        return FileResponse(file_handle, as_attachment=True, filename=obj.original_filename, content_type='application/pdf')
    def perform_destroy(self, instance):
        stored_file=instance.file
        instance.delete()
        if stored_file:
            stored_file.delete(save=False)
    def perform_create(self, serializer):
        uploaded=self.request.FILES.get('file')
        if not uploaded: raise serializers.ValidationError({'file':'PDF file is required.'})
        if uploaded.size > 20*1024*1024: raise serializers.ValidationError({'file':'Maximum file size is 20 MB.'})
        if not uploaded.name.lower().endswith('.pdf'): raise serializers.ValidationError({'file':'Only PDF files are accepted.'})
        header=uploaded.read(5); uploaded.seek(0)
        if header != b'%PDF-': raise serializers.ValidationError({'file':'The file does not appear to be a valid PDF.'})
        obj=serializer.save(owner=self.request.user, original_filename=Path(uploaded.name).name[:255])
        try:
            from pypdf import PdfReader
            reader=PdfReader(obj.file.path)
            obj.extracted_text='\n'.join((page.extract_text() or '') for page in reader.pages)[:2_000_000]
            obj.processing_status='processed' if obj.extracted_text.strip() else 'no_text'
            # Optional OCR path. Requires OCR_ENABLED=True and OCRmyPDF + Tesseract installed.
            if not obj.extracted_text.strip() and os.environ.get('OCR_ENABLED','false').lower()=='true':
                ocr_bin=shutil.which('ocrmypdf')
                if not ocr_bin:
                    obj.processing_status='ocr_unavailable'
                else:
                    try:
                        with tempfile.TemporaryDirectory(prefix='researchmate_ocr_') as tmp:
                            ocr_output=Path(tmp)/'ocr.pdf'
                            subprocess.run([ocr_bin,'--skip-text','--quiet',obj.file.path,str(ocr_output)],
                                check=True,timeout=120,capture_output=True)
                            ocr_reader=PdfReader(str(ocr_output))
                            obj.extracted_text='\n'.join((page.extract_text() or '') for page in ocr_reader.pages)[:2_000_000]
                            obj.processing_status='ocr_processed' if obj.extracted_text.strip() else 'ocr_no_text'
                    except (subprocess.SubprocessError, OSError):
                        obj.processing_status='ocr_failed'
        except ImportError:
            obj.processing_status='extraction_unavailable'
        except Exception:
            obj.processing_status='extraction_failed'
        obj.save(update_fields=['extracted_text','processing_status'])


class AITextView(APIView):
    permission_classes=[IsAuthenticated]
    max_text=100000
    def get_text(self, request):
        text=(request.data.get('text') or '').strip()
        paper_id=request.data.get('paper_id')
        if paper_id:
            paper=Paper.objects.filter(id=paper_id, project__owner=request.user).first()
            if not paper: return None, Response({'detail':'Paper not found.'},status=404)
            file_obj=paper.uploaded_files.filter(owner=request.user).order_by('-created_at').first()
            text=(file_obj.extracted_text if file_obj else '') or text
        if not text: return None, Response({'detail':'Provide text or an owned paper_id with extracted PDF text.'},status=400)
        if len(text)>self.max_text: return None, Response({'detail':'Text exceeds 100,000 characters.'},status=413)
        return text,None
    def provider_error(self, exc):
        return Response({'detail':str(exc)},status=503)


class SummarizeView(AITextView):
    def post(self, request):
        text,error=self.get_text(request)
        if error: return error
        length=request.data.get('length','medium')
        if length not in {'short','medium','long'}: return Response({'detail':'length must be short, medium, or long.'},status=400)
        if ai_is_configured():
            try:
                summary=ai_chat(f"Summarize the following academic text at {length} length. Preserve key findings and limitations; do not add facts.\n\n{text}")
                return Response({'summary':summary,'method':'configured_ai','notice':'AI-generated summary; verify against the source paper.'})
            except AIProviderError as exc: return self.provider_error(exc)
        sentences=[s.strip() for s in re.split(r'(?<=[.!?])\s+',text) if s.strip()]
        limit={'short':3,'medium':6,'long':10}[length]
        summary=' '.join(sentences[:limit])
        return Response({'summary':summary,'method':'extractive_sentence_selection','notice':'No AI provider configured; this is an extractive baseline, not an AI-generated paraphrase.'})


class KeywordsView(AITextView):
    def post(self, request):
        text,error=self.get_text(request)
        if error: return error
        count=request.data.get('count',8)
        try: count=max(1,min(int(count),30))
        except (TypeError,ValueError): return Response({'detail':'count must be an integer.'},status=400)
        if ai_is_configured():
            try:
                raw=ai_chat(f"Extract up to {count} concise academic keywords from this text. Return one keyword per line, no numbering.\n\n{text}")
                keywords=[line.strip(' -*\t') for line in raw.splitlines() if line.strip()][:count]
                return Response({'keywords':[{'keyword':k} for k in keywords],'method':'configured_ai','notice':'Keywords are AI-generated; review for relevance.'})
            except AIProviderError as exc: return self.provider_error(exc)
        words=re.findall(r"[A-Za-z][A-Za-z'-]{2,}",text.lower())
        stop=set('the and for with that this from are was were has have into using use based study paper research results method methods data'.split())
        freq={}
        for w in words:
            if w not in stop: freq[w]=freq.get(w,0)+1
        result=[{'keyword':w,'frequency':n} for w,n in sorted(freq.items(),key=lambda x:(-x[1],x[0]))[:count]]
        return Response({'keywords':result,'method':'frequency_based','notice':'No AI provider configured; frequency-based extraction used.'})


class TopicSuggestionsView(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request):
        topic=(request.data.get('topic') or request.data.get('field') or '').strip()
        if not topic: return Response({'detail':'topic or field is required.'},status=400)
        if len(topic)>500: return Response({'detail':'topic is too long.'},status=400)
        if ai_is_configured():
            try:
                raw=ai_chat(f"Suggest 5 research topics in {topic}. Return JSON array of objects with title and concise explanation. Treat them as ideas, not verified gaps.")
                try: items=json.loads(raw)
                except ValueError: items=[{'title':line.strip(' -*\t'),'explanation':'AI-generated idea; verify through literature review.'} for line in raw.splitlines() if line.strip()]
                if isinstance(items,dict): items=items.get('topic_suggestions',[])
                return Response({'topic_suggestions':items[:10],'method':'configured_ai','notice':'Suggestions are AI-generated and not verified research gaps.'})
            except AIProviderError as exc: return Response({'detail':str(exc)},status=503)
        ideas=[f'Comparative evaluation of methods in {topic}',f'Explainability and reproducibility in {topic}',f'Limitations and open challenges in {topic}',f'Applications of {topic} in a real-world setting']
        return Response({'topic_suggestions':[{'title':x,'explanation':'Template-based starting idea; validate against current literature.'} for x in ideas], 'method':'template_based','notice':'No AI provider configured; suggestions are not verified research gaps.'})


class TopicGapView(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request):
        topic=(request.data.get('topic') or '').strip()
        context=(request.data.get('paper_context') or '').strip()
        if not topic: return Response({'detail':'topic is required.'},status=400)
        if len(context)>100000: return Response({'detail':'paper_context exceeds 100,000 characters.'},status=413)
        if ai_is_configured():
            try:
                raw=ai_chat(f"Explore possible research gaps for topic: {topic}. Use this context only as supplied evidence: {context[:18000]}. Return JSON with subtopics (array), relationships (array), potential_gaps (array), and rationale. Clearly label all gaps as hypotheses, not verified facts.")
                try: data=json.loads(raw)
                except ValueError: data={'analysis':raw}
                data.update({'topic':topic,'status':'ai_generated_unverified','notice':'AI-generated exploration; verify against a systematic literature review.'})
                return Response(data)
            except AIProviderError as exc: return Response({'detail':str(exc)},status=503)
        terms=re.findall(r'[A-Za-z]{4,}',context.lower())
        counts={}
        for term in terms: counts[term]=counts.get(term,0)+1
        frequent=sorted(counts,key=lambda t:(-counts[t],t))[:10]
        return Response({'topic':topic,'subtopics':[f'{topic}: {t}' for t in frequent[:5]],'relationships':[],
            'potential_gaps':['Compare findings across datasets or populations','Evaluate reproducibility and external validity','Investigate limitations identified in the supplied papers'],
            'rationale':'Heuristic prompts derived from supplied context; not a verified systematic literature gap.',
            'status':'heuristic_not_verified','notice':'No AI provider configured; heuristic suggestions only.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_health(request):
    return Response({'status':'ok','authenticated_user':request.user.username})
