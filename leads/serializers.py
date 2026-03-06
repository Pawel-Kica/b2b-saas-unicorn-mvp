from rest_framework import serializers
from .models import Lead, Comment, Post, Competitor, Outreach, SiteSettings


class OutreachSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Outreach
        fields = ['id', 'lead', 'method', 'status', 'date', 'notes', 'script_text', 'audio_url', 'created_at']
        read_only_fields = ['id', 'lead', 'created_at', 'audio_url']

    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return None


class CommentSerializer(serializers.ModelSerializer):
    post_content = serializers.ReadOnlyField(source='post.content')
    post_url = serializers.ReadOnlyField(source='post.url')

    class Meta:
        model = Comment
        fields = ['id', 'comment_text', 'comment_url', 'commented_at', 'post_content', 'post_url', 'created_at']


class LeadSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(source='comment_set', many=True, read_only=True)
    outreach_records = OutreachSerializer(many=True, read_only=True)
    competitors = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'full_name', 'linkedin_profile', 'company', 'headline', 'picture_url',
            # Enrichment
            'email', 'job_title', 'followers', 'connections', 'company_website', 'country',
            # Related
            'comments', 'outreach_records', 'competitors',
        ]

    def get_competitors(self, obj):
        return list(
            obj.comment_set.values_list('post__competitor__name', flat=True).distinct()
        )


class CompetitorSerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True, default=0)
    lead_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Competitor
        fields = ['id', 'name', 'linkedin_url', 'post_count', 'lead_count']


class OutreachListSerializer(serializers.ModelSerializer):
    last_outreach_status = serializers.CharField(read_only=True)
    last_outreach_method = serializers.CharField(read_only=True)
    last_outreach_date = serializers.DateTimeField(read_only=True)
    outreach_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Lead
        fields = [
            'id', 'full_name', 'linkedin_profile', 'picture_url',
            'last_outreach_status', 'last_outreach_method', 'last_outreach_date',
            'outreach_count',
        ]


class PostSerializer(serializers.ModelSerializer):
    competitor_name = serializers.ReadOnlyField(source='competitor.name')
    lead_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Post
        fields = ['id', 'post_id', 'competitor', 'competitor_name', 'content', 'url',
                  'created_at', 'likes_count', 'comments_count', 'shares_count', 'images',
                  'lead_count']


class PostCommentSerializer(serializers.ModelSerializer):
    lead_name = serializers.ReadOnlyField(source='lead.full_name')
    lead_picture = serializers.ReadOnlyField(source='lead.picture_url')
    lead_headline = serializers.ReadOnlyField(source='lead.headline')
    lead_linkedin = serializers.ReadOnlyField(source='lead.linkedin_profile')
    lead_id = serializers.ReadOnlyField(source='lead.id')

    class Meta:
        model = Comment
        fields = ['id', 'comment_text', 'comment_url', 'commented_at',
                  'lead_id', 'lead_name', 'lead_picture', 'lead_headline', 'lead_linkedin']


class PostWithCommentsSerializer(serializers.ModelSerializer):
    competitor_name = serializers.ReadOnlyField(source='competitor.name')
    post_comments = PostCommentSerializer(source='comment_set', many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'post_id', 'competitor', 'competitor_name', 'content', 'url',
                  'created_at', 'likes_count', 'comments_count', 'shares_count', 'images',
                  'post_comments']


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['niche', 'about_me', 'niche_description']
