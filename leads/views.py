from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Lead, Competitor
from .serializers import LeadSerializer, CompetitorSerializer
from .services import fetch_and_process_leads


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer


class CompetitorViewSet(viewsets.ModelViewSet):
    queryset = Competitor.objects.all()
    serializer_class = CompetitorSerializer

    @action(detail=True, methods=['post'])
    def fetch_leads(self, request, pk=None):
        competitor = self.get_object()
        try:
            stats = fetch_and_process_leads(competitor.id)
            return Response({"status": "success", "stats": stats})
        except ValueError as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
