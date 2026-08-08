from rest_framework import serializers
from .models import BankAccount, BankTransaction


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'name', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ['id', 'account', 'tx_type', 'amount_pkr', 'description',
                  'reference_model', 'reference_id', 'balance_after', 'created_at']
        read_only_fields = ['id', 'created_at']
