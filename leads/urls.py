from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, CompetitorViewSet, PostViewSet, OutreachViewSet, OutreachListViewSet, dashboard_stats

router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'competitors', CompetitorViewSet, basename='competitor')
router.register(r'posts', PostViewSet, basename='post')
router.register(r'outreaches', OutreachListViewSet, basename='outreach-list')

outreach_list = OutreachViewSet.as_view({'get': 'list', 'post': 'create'})
outreach_detail = OutreachViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('dashboard/', dashboard_stats, name='dashboard-stats'),
    path('leads/<int:lead_pk>/outreach/', outreach_list, name='lead-outreach-list'),
    path('leads/<int:lead_pk>/outreach/<int:pk>/', outreach_detail, name='lead-outreach-detail'),
    path('', include(router.urls)),
]
