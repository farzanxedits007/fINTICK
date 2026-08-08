from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

USERS = [
    {'username': 'admin', 'password': 'admin123', 'role': User.Role.ADMIN, 'first_name': 'Admin', 'last_name': 'User'},
    {'username': 'sales1', 'password': 'pass1234', 'role': User.Role.SALES, 'first_name': 'Sales', 'last_name': 'User'},
    {'username': 'finance1', 'password': 'pass1234', 'role': User.Role.FINANCE, 'first_name': 'Finance', 'last_name': 'User'},
]


class Command(BaseCommand):
    help = 'Seed default users (admin, sales1, finance1)'

    def handle(self, *args, **options):
        for data in USERS:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'role': data['role'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'is_staff': data['role'] == User.Role.ADMIN,
                    'is_superuser': data['role'] == User.Role.ADMIN,
                },
            )
            if created:
                user.set_password(data['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user '{data['username']}'"))
            else:
                self.stdout.write(f"User '{data['username']}' already exists")
