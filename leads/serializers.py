from rest_framework import serializers
from .models import Lead, Interaction, Post

class InteractionSerializer(serializers.ModelSerializer):
    post_content = serializers.ReadOnlyField(source='post.content')

    class Meta:
        model = Interaction
        fields = ['id', 'comment_text', 'interaction_type', 'post_content', 'created_at']

class LeadSerializer(serializers.ModelSerializer):
    # To pozwoli nam wyciągnąć wszystkie komentarze leada w jednym JSONie
    interactions = InteractionSerializer(source='interaction_set', many=True, read_only=True)

    class Meta:
        model = Lead
        fields = ['id', 'full_name', 'linkedin_profile', 'company', 'role', 'interactions']