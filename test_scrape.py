import json
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.services import scrape_linkedin_posts

# Uncomment one to test:
url = "https://www.linkedin.com/in/richardjamesmoore/"
# url = "https://www.linkedin.com/in/lea-turner/"
# url = "https://www.linkedin.com/in/laraacostar/"

print(f"Scraping {url} ...")
items = scrape_linkedin_posts(url, max_posts=2, max_comments=2)
print(json.dumps(items, indent=2, default=str))
