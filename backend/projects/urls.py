from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (RegisterView, ProfileView, LogoutView, ProjectViewSet, PaperViewSet,
    NoteViewSet, CitationViewSet, MilestoneViewSet, ResearchConversationViewSet,
    LiteratureMatrixEntryViewSet, ResearchTaskViewSet, ResearchEventViewSet,
    PDFUploadViewSet, SummarizeView, KeywordsView, TopicSuggestionsView,
    TopicGapView, api_health)

router=DefaultRouter()
router.register('projects',ProjectViewSet,basename='project')
router.register('papers',PaperViewSet,basename='paper')
router.register('notes',NoteViewSet,basename='note')
router.register('citations',CitationViewSet,basename='citation')
router.register('milestones',MilestoneViewSet,basename='milestone')
router.register('conversations',ResearchConversationViewSet,basename='conversation')
router.register('literature-matrix',LiteratureMatrixEntryViewSet,basename='literature-matrix')
router.register('tasks',ResearchTaskViewSet,basename='research-task')
router.register('events',ResearchEventViewSet,basename='research-event')
router.register('uploads',PDFUploadViewSet,basename='paper-upload')

urlpatterns=[
    path('health/',api_health,name='api-health'),
    path('register/',RegisterView.as_view(),name='register'),
    path('login/',TokenObtainPairView.as_view(),name='login'),
    path('token/refresh/',TokenRefreshView.as_view(),name='token-refresh'),
    path('logout/',LogoutView.as_view(),name='logout'),
    path('profile/',ProfileView.as_view(),name='profile'),
    path('ai/summarize/',SummarizeView.as_view(),name='ai-summarize'),
    path('ai/keywords/',KeywordsView.as_view(),name='ai-keywords'),
    path('ai/topic-suggestions/',TopicSuggestionsView.as_view(),name='ai-topic-suggestions'),
    path('ai/topic-gap/',TopicGapView.as_view(),name='ai-topic-gap'),
    path('',include(router.urls)),
]
