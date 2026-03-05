import logging
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from apify_client import ApifyClient

from .models import Competitor, Post, Lead, Comment

logger = logging.getLogger(__name__)

APIFY_ACTOR_ID = 'A3cAPGpwBEG8RJwse'


def get_apify_client():
    token = settings.APIFY_API_TOKEN
    if not token:
        raise ValueError("APIFY_API_TOKEN is not configured. Set it in your .env file.")
    return ApifyClient(token)


def scrape_linkedin_posts(linkedin_url, max_posts, max_comments):
    client = get_apify_client()
    run_input = {
        # Target URL
        "targetUrls": [linkedin_url],
        # Important: posts + comments
        "maxPosts": max_posts,
        "scrapeComments": True,
        "maxComments": max_comments,
        # Disabled: reactions, reposts etc.
        "includeQuotePosts": False,
        "includeReposts": False,
        "scrapeReactions": False,
        "maxReactions": 0,
    }
    run = client.actor(APIFY_ACTOR_ID).call(run_input=run_input)
    return list(client.dataset(run["defaultDatasetId"]).iterate_items())


def fetch_and_process_leads(competitor_id):
    competitor = Competitor.objects.get(id=competitor_id)

    logger.info(f"Starting Apify run for competitor: {competitor.name}")
    items = scrape_linkedin_posts(competitor.linkedin_url, 5, 10)

    stats = {"posts": 0, "leads": 0, "comments": 0}

    for item in items:
        if item.get("type") != "post":
            continue

        post_obj = save_post(competitor, item)
        if post_obj:
            stats["posts"] += 1

        for comment in item.get("comments", []):
            lead_obj = save_lead_from_comment(comment)
            if lead_obj:
                stats["leads"] += 1
            if lead_obj and post_obj:
                save_comment(lead_obj, post_obj, comment)
                stats["comments"] += 1

    logger.info(f"Done processing {competitor.name}. Stats: {stats}")
    return stats


def save_post(competitor, item):
    post_id = item.get("postId") or item.get("id")
    if not post_id:
        return None

    posted_at = item.get("postedAt")
    if isinstance(posted_at, dict):
        created_at = parse_date(posted_at.get("date"))
    else:
        created_at = parse_date(posted_at)

    engagement = item.get("engagement", {})
    images = [img["url"] for img in item.get("postImages", []) if img.get("url")]

    post, _ = Post.objects.update_or_create(
        post_id=post_id,
        defaults={
            "competitor": competitor,
            "content": (item.get("content") or "")[:5000],
            "url": item.get("url", ""),
            "created_at": created_at or timezone.now(),
            "likes_count": engagement.get("likes", 0),
            "comments_count": engagement.get("comments", 0),
            "shares_count": engagement.get("shares", 0),
            "images": images,
        },
    )
    return post


def save_lead_from_comment(comment_data):
    actor = comment_data.get("actor", {})
    profile_url = (actor.get("linkedinUrl") or "").rstrip("/")
    if not profile_url:
        return None

    full_name = actor.get("name") or "Unknown"
    position = actor.get("position") or ""
    company, role = parse_headline(position)

    lead, _ = Lead.objects.update_or_create(
        linkedin_profile=profile_url,
        defaults={
            "full_name": full_name,
            "headline": position or None,
            "picture_url": actor.get("pictureUrl") or None,
            "company": company or None,
            "role": role or None,
        },
    )
    return lead


def parse_headline(headline):
    if not headline:
        return ("", "")
    if " at " in headline:
        parts = headline.split(" at ", 1)
        return (parts[1].strip(), parts[0].strip())
    return ("", headline.strip())


def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def save_comment(lead_obj, post_obj, comment_data):
    external_id = comment_data.get("id", "")
    if not external_id:
        external_id = f"{post_obj.post_id}__{lead_obj.linkedin_profile}"

    comment, _ = Comment.objects.update_or_create(
        external_id=external_id,
        defaults={
            "lead": lead_obj,
            "post": post_obj,
            "comment_text": comment_data.get("commentary", ""),
            "comment_url": comment_data.get("linkedinUrl") or None,
            "commented_at": parse_date(comment_data.get("createdAt")),
        },
    )
    return comment
