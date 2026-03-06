#!/usr/bin/env python3
"""
Migrate all data from SQLite (db.sqlite3) to PostgreSQL.

Usage:
    # With Docker (PostgreSQL running via docker-compose):
    docker-compose up db -d
    docker-compose exec backend python migrate_sqlite_to_postgres.py

    # Without Docker (local PostgreSQL):
    python migrate_sqlite_to_postgres.py

Prerequisites:
    - PostgreSQL database must exist and Django migrations must be applied
    - db.sqlite3 (or db.sqlite3.backup) must be present in the backend/ directory
    - Django settings must point to the target PostgreSQL database

What it does:
    1. Reads all data from SQLite directly (no Django ORM dependency on SQLite)
    2. Writes into PostgreSQL using Django ORM (respects current schema)
    3. Preserves original primary keys and foreign key relationships
    4. Resets PostgreSQL sequences so new inserts get correct IDs
    5. Skips migration history (django_migrations) — PostgreSQL has its own
    6. Idempotent: clears target tables before inserting (safe to re-run)
"""

import os
import sys
import sqlite3
import json
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.contrib.auth.models import User
from django.db import connection
from leads.models import Competitor, Post, Lead, Comment, Outreach, SiteSettings


def find_sqlite_db():
    """Find the SQLite database file."""
    base = Path(__file__).resolve().parent
    for name in ['db.sqlite3.backup', 'db.sqlite3']:
        path = base / name
        if path.exists():
            print(f"Using SQLite source: {path}")
            return str(path)
    print("ERROR: No SQLite database found (looked for db.sqlite3.backup and db.sqlite3)")
    sys.exit(1)


def get_sqlite_data(db_path, table):
    """Read all rows from a SQLite table as list of dicts."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute(f'SELECT * FROM "{table}"')
        rows = [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        rows = []
    conn.close()
    return rows


def reset_sequence(table_name):
    """Reset PostgreSQL auto-increment sequence to max(id) + 1."""
    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT setval(
                pg_get_serial_sequence('{table_name}', 'id'),
                COALESCE((SELECT MAX(id) FROM "{table_name}"), 0) + 1,
                false
            )
        """)


def migrate():
    db_path = find_sqlite_db()

    # --- Auth User ---
    users = get_sqlite_data(db_path, 'auth_user')
    print(f"\nMigrating {len(users)} user(s)...")
    for u in users:
        User.objects.update_or_create(
            id=u['id'],
            defaults={
                'username': u['username'],
                'password': u['password'],  # hashed password, preserved as-is
                'email': u.get('email', ''),
                'first_name': u.get('first_name', ''),
                'last_name': u.get('last_name', ''),
                'is_staff': bool(u.get('is_staff', 0)),
                'is_active': bool(u.get('is_active', 1)),
                'is_superuser': bool(u.get('is_superuser', 0)),
            }
        )
    reset_sequence('auth_user')
    print(f"  -> {User.objects.count()} user(s) in PostgreSQL")

    # --- Competitors ---
    competitors = get_sqlite_data(db_path, 'leads_competitor')
    print(f"\nMigrating {len(competitors)} competitor(s)...")
    Competitor.objects.all().delete()
    for c in competitors:
        Competitor.objects.create(id=c['id'], name=c['name'], linkedin_url=c['linkedin_url'])
    reset_sequence('leads_competitor')
    print(f"  -> {Competitor.objects.count()} competitor(s) in PostgreSQL")

    # --- Posts ---
    posts = get_sqlite_data(db_path, 'leads_post')
    print(f"\nMigrating {len(posts)} post(s)...")
    Post.objects.all().delete()
    for p in posts:
        images = p.get('images', '[]')
        if isinstance(images, str):
            try:
                images = json.loads(images)
            except (json.JSONDecodeError, TypeError):
                images = []
        Post.objects.create(
            id=p['id'],
            competitor_id=p['competitor_id'],
            post_id=p['post_id'],
            content=p['content'] or '',
            url=p['url'] or '',
            created_at=p['created_at'],
            likes_count=p.get('likes_count', 0) or 0,
            comments_count=p.get('comments_count', 0) or 0,
            shares_count=p.get('shares_count', 0) or 0,
            images=images,
        )
    reset_sequence('leads_post')
    print(f"  -> {Post.objects.count()} post(s) in PostgreSQL")

    # --- Leads ---
    leads = get_sqlite_data(db_path, 'leads_lead')
    print(f"\nMigrating {len(leads)} lead(s)...")
    Lead.objects.all().delete()
    for l in leads:
        Lead.objects.create(
            id=l['id'],
            full_name=l['full_name'],
            linkedin_profile=l['linkedin_profile'],
            company=l.get('company') or '',
            role=l.get('role') or '',
            headline=l.get('headline') or '',
            picture_url=l.get('picture_url') or '',
            email=l.get('email') or '',
            job_title=l.get('job_title') or '',
            followers=l.get('followers'),
            connections=l.get('connections'),
            company_website=l.get('company_website') or '',
            country=l.get('country') or '',
        )
    reset_sequence('leads_lead')
    print(f"  -> {Lead.objects.count()} lead(s) in PostgreSQL")

    # --- Comments ---
    comments = get_sqlite_data(db_path, 'leads_comment')
    print(f"\nMigrating {len(comments)} comment(s)...")
    Comment.objects.all().delete()
    for c in comments:
        Comment.objects.create(
            id=c['id'],
            external_id=c.get('external_id'),
            lead_id=c['lead_id'],
            post_id=c['post_id'],
            comment_text=c.get('comment_text') or '',
            comment_url=c.get('comment_url') or '',
            commented_at=c.get('commented_at'),
            created_at=c['created_at'],
        )
    reset_sequence('leads_comment')
    print(f"  -> {Comment.objects.count()} comment(s) in PostgreSQL")

    # --- Outreach ---
    outreach_rows = get_sqlite_data(db_path, 'leads_outreach')
    print(f"\nMigrating {len(outreach_rows)} outreach record(s)...")
    Outreach.objects.all().delete()
    for o in outreach_rows:
        Outreach.objects.create(
            id=o['id'],
            lead_id=o['lead_id'],
            method=o['method'],
            status=o.get('status', 'pending'),
            date=o['date'],
            notes=o.get('notes') or '',
            audio_file=o.get('audio_file') or '',
            script_text=o.get('script_text') or '',
            created_at=o['created_at'],
        )
    reset_sequence('leads_outreach')
    print(f"  -> {Outreach.objects.count()} outreach record(s) in PostgreSQL")

    # --- SiteSettings ---
    settings_rows = get_sqlite_data(db_path, 'leads_sitesettings')
    print(f"\nMigrating {len(settings_rows)} site settings record(s)...")
    SiteSettings.objects.all().delete()
    for s in settings_rows:
        SiteSettings.objects.create(
            id=s['id'],
            niche=s.get('niche') or '',
            niche_description=s.get('niche_description') or '',
            about_me=s.get('about_me') or '',
        )
    reset_sequence('leads_sitesettings')
    print(f"  -> {SiteSettings.objects.count()} site settings record(s) in PostgreSQL")

    print("\n=== Migration complete! ===")
    print("All data has been transferred from SQLite to PostgreSQL.")
    print("Original IDs and relationships are preserved.")
    print("Your superuser password is unchanged — log in as before.")


if __name__ == '__main__':
    migrate()
