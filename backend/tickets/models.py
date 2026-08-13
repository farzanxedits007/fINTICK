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

    class VisaType(models.TextChoices):
        VISIT = 'visit', 'Visit'
        WORK = 'work', 'Work'
        STUDENT = 'student', 'Student'

    class Package(models.TextChoices):
        STAR = 'star', 'Star'
        ECONOMY = 'economy', 'Economy'

    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        PAID = 'paid', 'Paid'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_type = models.CharField(max_length=10, choices=TicketType.choices, default=TicketType.FLIGHT)

    sector = models.CharField(max_length=100, blank=True, help_text='Flight sector e.g. KHI-JED')
    country = models.CharField(max_length=100, blank=True, help_text='Visa country')
    visa_type = models.CharField(max_length=20, choices=VisaType.choices, blank=True)
    package = models.CharField(max_length=20, choices=Package.choices, blank=True, help_text='Umrah package')
    stay_date = models.DateField(null=True, blank=True, help_text='Umrah stay date')
    makkah_hotel = models.CharField(max_length=200, blank=True)
    madina_hotel = models.CharField(max_length=200, blank=True)

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

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
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

    def delete(self, *args, **kwargs):
        from ledger_voucher import reverse_money
        for entry in self.customer_entries.filter(entry_type='credit'):
            reverse_money(entry.payment_method or 'bank', 'customer_ledger', entry.id)
        for entry in self.vendor_entries.filter(entry_type='debit'):
            reverse_money(entry.payment_method or 'bank', 'vendor_ledger', entry.id)
        self.customer_entries.all().delete()
        self.vendor_entries.all().delete()
        super().delete(*args, **kwargs)
