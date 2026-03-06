import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path

import requests as http_requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from apify_client import ApifyClient
from openai import OpenAI

from .models import Competitor, Post, Lead, Comment, SiteSettings

logger = logging.getLogger(__name__)

APIFY_ACTOR_ID = 'A3cAPGpwBEG8RJwse'
APIFY_ENRICHMENT_ACTOR_ID = '2SyF0bVxmgGr8IVCZ'

# Maps Lead model field -> Apify enrichment API key
ENRICHMENT_FIELD_MAP = {
    'full_name': 'fullName',
    'headline': 'headline',
    'company': 'companyName',
    'job_title': 'jobTitle',
    'email': 'email',
    'followers': 'followers',
    'connections': 'connections',
    'company_website': 'companyWebsite',
    'country': 'addressCountryOnly',
}


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


def fetch_and_process_leads(competitor_id, max_posts=5, max_comments=10):
    competitor = Competitor.objects.get(id=competitor_id)

    logger.info(f"Starting Apify run for competitor: {competitor.name}")
    items = scrape_linkedin_posts(competitor.linkedin_url, max_posts, max_comments)

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
            "url": item.get("linkedinUrl") or item.get("url", ""),
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


def enrich_lead(lead_id):
    """Enrich a lead using mock Apify data.

    The real Apify enrichment actor (2SyF0bVxmgGr8IVCZ) requires a paid API key.
    Instead, we load pre-saved mock responses for 5 LinkedIn profiles from
    backend/_mocks/mocks-enrich-profiles-response.json.
    """
    lead = Lead.objects.get(id=lead_id)

    if not lead.linkedin_profile:
        raise ValueError("Lead has no LinkedIn profile URL.")

    # Load mock enrichment data instead of calling the paid Apify API
    mock_file = Path(__file__).resolve().parent.parent / "_mocks" / "mocks-enrich-profiles-response.json"
    with open(mock_file, "r") as f:
        mock_profiles = json.load(f)

    # Normalize URL for matching: lowercase, strip trailing slash
    normalize = lambda url: url.rstrip("/").lower()
    lead_url = normalize(lead.linkedin_profile)

    data = None
    for profile in mock_profiles:
        if normalize(profile.get("linkedinUrl", "")) == lead_url:
            data = profile
            break

    if data is None:
        raise ValueError(
            f"Profile '{lead.linkedin_profile}' is not in the mock data. "
            "Real enrichment via Apify requires a paid plan."
        )

    # Simulate API latency
    time.sleep(3)

    for model_field, api_key in ENRICHMENT_FIELD_MAP.items():
        value = data.get(api_key)
        if value:
            setattr(lead, model_field, value)
    lead.save()
    return lead


def discover_competitors(niche, existing_competitors, prompt=''):
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")

    client = OpenAI(api_key=api_key)

    existing_list = "\n".join(
        f"- {c['name']} ({c['linkedin_url']})" for c in existing_competitors
    ) if existing_competitors else "None yet."

    system_msg = (
        "You are a B2B lead generation strategist. Your job is to suggest exactly "
        "THREE LinkedIn INDIVIDUAL profiles (thought leaders, creators, influencers) "
        "whose post commenters are likely B2B buyers and decision-makers in a given niche.\n\n"
        "CONTEXT: The user runs a tool that scrapes LinkedIn post comments from the "
        "profiles you suggest. The commenters become warm sales leads. The value of a "
        "profile is the QUALITY and QUANTITY of people who comment on their posts.\n\n"
        "HARD REQUIREMENTS (every suggestion must satisfy ALL):\n"
        "1. INDIVIDUALS ONLY — personal profiles only. URL must be linkedin.com/in/<slug>. "
        "Never suggest company pages (linkedin.com/company/...).\n"
        "2. AT LEAST 20,000 FOLLOWERS — the person must have 20,000+ LinkedIn followers. "
        "Do not suggest anyone with fewer. If you are unsure of follower count, use web "
        "search to verify before including them.\n"
        "3. HIGH ENGAGEMENT — they consistently get 10+ comments per post.\n"
        "4. COMMENTER QUALITY — comment sections attract senior professionals (VPs, "
        "Directors, Founders, Heads of departments). Avoid profiles where comments are "
        "mostly junior marketers, students, or engagement-pod participants.\n"
        "5. ACTIVE POSTER — they post at least weekly. Dormant accounts are invalid.\n\n"
        "LINKEDIN URL RULES (critical — wrong URLs break the user's workflow):\n"
        "- Return the EXACT, current LinkedIn profile URL. Format: "
        "https://www.linkedin.com/in/<vanity-slug>\n"
        "- The vanity slug is the part after /in/ (e.g. for linkedin.com/in/johndoe the "
        "slug is johndoe). It is often the person's name in lowercase, no spaces, sometimes "
        "with numbers or extra characters. One typo makes the URL wrong.\n"
        "- If your training data might be outdated, USE WEB SEARCH to look up the person's "
        "current LinkedIn profile and copy the URL exactly from the search result or their "
        "profile page. Prefer verifying URLs over guessing.\n"
        "- Do not invent or approximate URLs. Only output a URL you have verified or are "
        "highly confident is correct.\n\n"
        "OUTPUT: Return exactly 3 suggestions. For each provide:\n"
        "- name: Full name as it appears on LinkedIn.\n"
        "- linkedin_url: The exact personal profile URL (https://www.linkedin.com/in/...).\n"
        "- description: One sentence on what they post about; one sentence on why their "
        "comment section is valuable for this niche.\n\n"
        "Do NOT suggest any profile already in the existing list below."
    )

    user_msg = f"Niche: {niche}\n\nExisting competitors (do not repeat these):\n{existing_list}"
    if prompt:
        user_msg += f"\n\nAdditional context: {prompt}"

    response = client.chat.completions.create(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "competitor_suggestions",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "competitors": {
                            "type": "array",
                            "minItems": 3,
                            "maxItems": 3,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "linkedin_url": {"type": "string"},
                                    "description": {"type": "string"},
                                },
                                "required": ["name", "linkedin_url", "description"],
                                "additionalProperties": False,
                            },
                        }
                    },
                    "required": ["competitors"],
                    "additionalProperties": False,
                },
            },
        },
    )

    data = json.loads(response.choices[0].message.content)
    return data["competitors"]


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


# ---------------------------------------------------------------------------
# Voice Outreach (ElevenLabs TTS)
# ---------------------------------------------------------------------------

def generate_voice_script(lead, site_settings):
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")

    lead_first_name = (lead.full_name or "").split()[0] if lead.full_name else "there"
    lead_role = lead.role or lead.headline or "professional"
    lead_company = lead.company or ""

    about_me = site_settings.about_me or ""
    niche = site_settings.niche or "your industry"
    niche_desc = site_settings.niche_description or ""

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You write short, personalized voice note scripts for cold outreach. "
                    "The script will be read by ElevenLabs Eleven v3 TTS which natively handles "
                    "emotions and delivery from inline tags.\n\n"
                    "AVAILABLE TAGS (organized by purpose):\n"
                    "Trust & Authority: [matter-of-fact], [serious], [calm], [professional], "
                    "[reassuring], [grounded], [confident]\n"
                    "Energy & Hype: [excited], [bright], [lighthearted], [warmly], [cheerful], "
                    "[enthusiastic], [friendly]\n"
                    "Urgency & Emphasis: [emphasized], [urgent], [with emphasis], [deliberate], "
                    "[rapid-fire], [dramatic tone]\n"
                    "Conversational Hooks: [clears throat], [soft chuckle], [pause], [reflective], "
                    "[whispering], [conversational tone], [thoughtful]\n"
                    "Empathy & Objection Handling: [gently], [understanding], [hesitates], [sighs], "
                    "[softly], [sincere]\n\n"
                    "RULES:\n"
                    "- Keep it under 15 seconds when spoken (~40 words).\n"
                    "- Use 2-4 tags per script. Place them before the phrase they apply to.\n"
                    "- Mix tag categories for natural delivery — e.g. start with a conversational "
                    "hook, build with energy, close with trust.\n"
                    "- Sound like a real voice message from a friend, not a sales pitch.\n"
                    "- Do NOT use markdown, quotes, or any formatting besides the emotion tags."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a voice note script for this lead:\n"
                    f"- First name: {lead_first_name}\n"
                    f"- Role: {lead_role}\n"
                    f"- Company: {lead_company or 'unknown'}\n\n"
                    f"About the sender:\n{about_me}\n\n"
                    f"Niche: {niche}\n"
                    f"Context: {niche_desc}"
                ),
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "voice_script",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "script": {"type": "string", "description": "The voice note script with Eleven v3 emotion tags"},
                    },
                    "required": ["script"],
                    "additionalProperties": False,
                },
            },
        },
    )

    data = json.loads(response.choices[0].message.content)
    return data["script"]


def generate_voice_audio(script_text):
    api_key = settings.ELEVENLABS_API_KEY
    voice_id = settings.ELEVENLABS_VOICE_ID
    if not api_key or not voice_id:
        raise ValueError("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set in .env")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    resp = http_requests.post(
        url,
        headers={"xi-api-key": api_key, "Accept": "audio/mpeg", "Content-Type": "application/json"},
        json={
            "text": script_text,
            "model_id": "eleven_v3",
            "voice_settings": {
                "speed": 1.25,
            },
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


def create_voice_outreach(lead_id):
    from .models import Outreach  # avoid circular at module level

    lead = Lead.objects.get(id=lead_id)
    site_settings = SiteSettings.load()

    script_text = generate_voice_script(lead, site_settings)
    audio_bytes = generate_voice_audio(script_text)

    filename = f"voice_{lead_id}_{int(time.time())}.mp3"
    return {"audio_file": ContentFile(audio_bytes, name=filename), "script_text": script_text}
