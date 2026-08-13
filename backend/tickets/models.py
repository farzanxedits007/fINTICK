import uuid
from django.db import models
from django.conf import settings


class Ticket(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'

    class TicketType(models.TextChoices):
        FLIGHT = 'flight', 'Flight Ticket'
        VISA = 'visa', 'Visa'
        UMRAH = 'umrah', 'Umrah'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_type = models.CharField(max_length=10, choices=TicketType.choices, default=TicketType.FLIGHT)

    customer = models.ForeignKey('accounts.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    vendor = models.ForeignKey('accounts.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')

    passenger_name = models.CharField(max_length=200)
    passport_no = models.CharField(max_length=50)
    date_of_birth = models.DateField(null=True, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)

    pnr = models.CharField(max_length=50, blank=True, verbose_name='PNR')
    flight_date = models.DateField(null=True, blank=True)
    airline = models.CharField(max_length=100, blank=True)

    vendor_cost_pkr = models.DecimalField(max_digits=12, decimal_places=2,
        help_text='Vendor Cost in PKR — what we owe the vendor')
    ticket_price_pkr = models.DecimalField(max_digits=12, decimal_places=2,
        help_text='Ticket Price in PKR — what the customer pays us')
    profit_pkr = models.DecimalField(max_digits=12, decimal_places=2, default=0,
        help_text='Auto-calculated: Ticket Price - Vendor Cost')

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['passenger_name']),
            models.Index(fields=['passport_no']),
            models.Index(fields=['status']),
            models.Index(fields=['pnr']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.passenger_name} — {self.passport_no}"

    def save(self, *args, **kwargs):
        self.profit_pkr = self.ticket_price_pkr - self.vendor_cost_pkr
        super().save(*args, **kwargs)
