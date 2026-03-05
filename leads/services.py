import requests
from .models import Competitor, Post, Lead, Interaction

def fetch_and_process_leads(competitor_id):
    # 1. Pobierz konkurenta z bazy danych
    competitor = Competitor.objects.get(id=competitor_id)
    
    # 2. Ustal URL do API (np. Apify)
    # Na razie użyjemy atrapy (placeholder)
    api_url = "https://api.apify.com/v2/..." 
    
    print(f"Zaczynam pobieranie dla: {competitor.name}")
    
def save_interaction(lead_obj, post_obj, comment_data):
    # comment_data to słownik np. {"id": "123", "text": "Super!"}
    
    interaction, created = Interaction.objects.update_or_create(
        external_id=comment_data["id"],
        defaults={
            "lead": lead_obj, # Jaką zmienną tu wstawisz?
            "post": post_obj, # A tutaj?
            "comment_text": comment_data["text"]
        }
    )
    return interaction