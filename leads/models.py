from django.db import models

class Competitor(models.Model):
    name = models.CharField(max_length=255)
    linkedin_url = models.URLField(unique=True)
    
    def __str__(self):
        return self.name

class Post(models.Model):
    competitor = models.ForeignKey(Competitor, on_delete=models.CASCADE, related_name='posts')
    post_id = models.CharField(max_length=100, unique=True)
    content = models.TextField()
    url = models.URLField()
    created_at = models.DateTimeField()

    def __str__(self):
        return f"Post {self.post_id} by {self.competitor.name}"

class Lead(models.Model):
    full_name = models.CharField(max_length=255)
    linkedin_profile = models.URLField(unique=True)
    company = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=255, null=True, blank=True)
    interactions = models.ManyToManyField(Post, through='Interaction')

    def __str__(self):
        return self.full_name

class Interaction(models.Model):
    external_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    comment_text = models.TextField(null=True, blank=True)
    interaction_type = models.CharField(max_length=20, default='comment')
    created_at = models.DateTimeField(auto_now_add=True)