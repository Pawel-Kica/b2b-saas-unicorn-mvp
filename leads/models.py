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
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    shares_count = models.IntegerField(default=0)
    images = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Post {self.post_id} by {self.competitor.name}"


OUTREACH_METHOD_CHOICES = [
    ('email', 'Email'),
    ('linkedin', 'LinkedIn'),
]

OUTREACH_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('no_reply', 'No Reply'),
    ('interested', 'Interested'),
    ('not_interested', 'Not Interested'),
]


class Lead(models.Model):
    full_name = models.CharField(max_length=255)
    linkedin_profile = models.URLField(unique=True)
    company = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=255, null=True, blank=True)
    headline = models.CharField(max_length=500, null=True, blank=True)
    picture_url = models.URLField(null=True, blank=True)
    posts = models.ManyToManyField(Post, through='Comment')

    # Enrichment data
    email = models.CharField(max_length=255, null=True, blank=True)
    job_title = models.CharField(max_length=255, null=True, blank=True)
    followers = models.IntegerField(null=True, blank=True)
    connections = models.IntegerField(null=True, blank=True)
    company_website = models.URLField(null=True, blank=True)
    country = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.full_name


class Comment(models.Model):
    external_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    comment_text = models.TextField(null=True, blank=True)
    comment_url = models.URLField(null=True, blank=True)
    commented_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Outreach(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='outreach_records')
    method = models.CharField(max_length=10, choices=OUTREACH_METHOD_CHOICES)
    status = models.CharField(max_length=15, choices=OUTREACH_STATUS_CHOICES, default='pending')
    date = models.DateField()
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.method} to {self.lead.full_name} on {self.date}"
