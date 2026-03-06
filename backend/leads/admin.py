from django.contrib import admin
from .models import Competitor, Post, Lead, Comment, SiteSettings

admin.site.register(Competitor)
admin.site.register(Post)
admin.site.register(Lead)
admin.site.register(Comment)
admin.site.register(SiteSettings)
