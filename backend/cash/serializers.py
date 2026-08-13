from rest_framework import serializers
from .models import CashAccount, CashTransaction


class CashAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashAccount
        fields = ['id', 'name', 'balance', 'created_at', 'updated_at']


class CashTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashTransaction
        fields = ['id', 'account', 'tx_type', 'amount_pkr', 'description',
                  'reference_model', 'reference_id', 'balance_after', 'created_at']
