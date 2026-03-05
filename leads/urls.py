from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, CompetitorViewSet

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'competitors', CompetitorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]