from django.core.management.base import BaseCommand
from leads.models import Competitor
from leads.services import fetch_and_process_leads


class Command(BaseCommand):
    help = 'Fetch LinkedIn posts and extract leads for competitors via Apify'

    def add_arguments(self, parser):
        parser.add_argument(
            '--competitor-id', type=int, default=None,
            help='Fetch for a specific competitor ID only',
        )

    def handle(self, *args, **options):
        competitor_id = options['competitor_id']
        if competitor_id:
            competitors = Competitor.objects.filter(id=competitor_id)
        else:
            competitors = Competitor.objects.all()

        if not competitors.exists():
            self.stderr.write(self.style.WARNING('No competitors found.'))
            return

        for competitor in competitors:
            self.stdout.write(f'Processing: {competitor.name}')
            try:
                stats = fetch_and_process_leads(competitor.id)
                self.stdout.write(self.style.SUCCESS(f'  Done: {stats}'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'  Error: {e}'))
