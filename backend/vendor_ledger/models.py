import uuid
from django.db import models


class VendorLedgerEntry(models.Model):
    class EntryType(models.TextChoices):
        DEBIT = 'debit', 'Debit'
        CREDIT = 'credit', 'Credit'

    class Status(models.TextChoices):
        OUTSTANDING = 'outstanding', 'Outstanding'
        PAID = 'paid', 'Paid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey('tickets.Ticket', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_entries')
    vendor = models.ForeignKey('accounts.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_entries')
    passenger_name = models.CharField(max_length=200)
    entry_type = models.CharField(max_length=10, choices=EntryType.choices, default=EntryType.CREDIT)
    amount_pkr = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OUTSTANDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vendor_ledger'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['passenger_name']),
        ]

    def __str__(self):
        return f"{self.entry_type.upper()} {self.amount_pkr} PKR — {self.passenger_name}"
