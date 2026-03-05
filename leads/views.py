from django.db.models import Count, Subquery, OuterRef

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response

from .models import Lead, Competitor, Post, Outreach
from .serializers import LeadSerializer, CompetitorSerializer, PostSerializer, PostWithCommentsSerializer, OutreachSerializer, OutreachListSerializer
from .services import fetch_and_process_leads, enrich_lead


@api_view(['GET'])
def dashboard_stats(request):
    return Response({
        "totals": {
            "competitors": Competitor.objects.count(),
            "leads": Lead.objects.count(),
            "posts": Post.objects.count(),
            "outreaches": Outreach.objects.count(),
        },
        "leads_by_competitor": list(
            Competitor.objects.annotate(count=Count('posts__comment__lead', distinct=True))
            .values('name', 'count').order_by('-count')
        ),
        "posts_by_competitor": list(
            Competitor.objects.annotate(count=Count('posts'))
            .values('name', 'count').order_by('-count')
        ),
        "outreach_by_status": list(
            Outreach.objects.values('status')
            .annotate(count=Count('id')).order_by('-count')
        ),
        "outreach_by_method": list(
            Outreach.objects.values('method')
            .annotate(count=Count('id')).order_by('-count')
        ),
        "leads_by_country": list(
            Lead.objects.exclude(country__isnull=True).exclude(country='')
            .values('country').annotate(count=Count('id')).order_by('-count')
        ),
    })


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['full_name', 'company', 'headline']
    ordering_fields = ['full_name', 'company', 'headline', 'comment_count']
    ordering = ['-comment_count']

    def get_queryset(self):
        qs = Lead.objects.prefetch_related('comment_set__post__competitor', 'outreach_records').annotate(
            comment_count=Count('comment')
        )
        competitor = self.request.query_params.get('competitor')
        if competitor:
            qs = qs.filter(comment__post__competitor__id=competitor).distinct()
        return qs

    @action(detail=True, methods=['post'])
    def enrich(self, request, pk=None):
        lead = self.get_object()
        try:
            enrich_lead(lead.id)
            lead_refreshed = self.get_queryset().get(id=lead.id)
            serializer = self.get_serializer(lead_refreshed)
            return Response({"status": "success", "lead": serializer.data})
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


class CompetitorViewSet(viewsets.ModelViewSet):
    serializer_class = CompetitorSerializer
    filter_backends = [SearchFilter]
    search_fields = ['name', 'linkedin_url']

    def get_queryset(self):
        return Competitor.objects.annotate(
            post_count=Count('posts', distinct=True),
            lead_count=Count('posts__comment__lead', distinct=True),
        )

    @action(detail=True, methods=['post'])
    def fetch_leads(self, request, pk=None):
        competitor = self.get_object()
        max_posts = int(request.data.get('max_posts', 5))
        max_comments = int(request.data.get('max_comments', 10))
        try:
            stats = fetch_and_process_leads(competitor.id, max_posts=max_posts, max_comments=max_comments)
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

    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        competitor = self.get_object()
        posts = Post.objects.filter(competitor=competitor).prefetch_related(
            'comment_set__lead'
        ).order_by('-created_at')
        serializer = PostWithCommentsSerializer(posts, many=True)
        return Response(serializer.data)


class PostViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PostSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['content', 'competitor__name']
    ordering_fields = ['created_at', 'likes_count', 'comments_count', 'shares_count', 'lead_count', 'competitor__name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Post.objects.select_related('competitor').annotate(
            lead_count=Count('comment__lead', distinct=True)
        )
        competitor = self.request.query_params.get('competitor')
        if competitor:
            qs = qs.filter(competitor__id=competitor)
        return qs

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        post = Post.objects.select_related('competitor').prefetch_related(
            'comment_set__lead'
        ).get(pk=pk)
        serializer = PostWithCommentsSerializer(post)
        return Response(serializer.data)


class OutreachListViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OutreachListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['full_name']
    ordering_fields = ['full_name', 'last_outreach_date']
    ordering = ['-last_outreach_date']

    def get_queryset(self):
        latest = Outreach.objects.filter(lead=OuterRef('pk')).order_by('-date')
        return Lead.objects.filter(outreach_records__isnull=False).distinct().annotate(
            last_outreach_status=Subquery(latest.values('status')[:1]),
            last_outreach_method=Subquery(latest.values('method')[:1]),
            last_outreach_date=Subquery(latest.values('date')[:1]),
            outreach_count=Count('outreach_records'),
        )


class OutreachViewSet(viewsets.ModelViewSet):
    serializer_class = OutreachSerializer

    def get_queryset(self):
        return Outreach.objects.filter(lead_id=self.kwargs['lead_pk'])

    def perform_create(self, serializer):
        serializer.save(lead_id=self.kwargs['lead_pk'])
