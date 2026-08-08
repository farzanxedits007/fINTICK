import uuid
from django.db import models


class BankAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, default='Main Account')
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bank_accounts'

    def __str__(self):
        return f"{self.name} — PKR {self.balance}"


class BankTransaction(models.Model):
    class TxType(models.TextChoices):
        DEPOSIT = 'deposit', 'Deposit'
        WITHDRAWAL = 'withdrawal', 'Withdrawal'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    tx_type = models.CharField(max_length=12, choices=TxType.choices)
    amount_pkr = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500, blank=True)
    reference_model = models.CharField(max_length=50, blank=True)
    reference_id = models.UUIDField(null=True, blank=True)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bank_transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tx_type.upper()} PKR {self.amount_pkr} — {self.description}"
