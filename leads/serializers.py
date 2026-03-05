from rest_framework import serializers
from .models import Lead, Comment, Post, Competitor


class CommentSerializer(serializers.ModelSerializer):
    post_content = serializers.ReadOnlyField(source='post.content')
    post_url = serializers.ReadOnlyField(source='post.url')

    class Meta:
        model = Comment
        fields = ['id', 'comment_text', 'comment_url', 'commented_at', 'post_content', 'post_url', 'created_at']


class LeadSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(source='comment_set', many=True, read_only=True)

    class Meta:
        model = Lead
        fields = ['id', 'full_name', 'linkedin_profile', 'company', 'role', 'headline', 'picture_url', 'comments']


class CompetitorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competitor
        fields = ['id', 'name', 'linkedin_url']
