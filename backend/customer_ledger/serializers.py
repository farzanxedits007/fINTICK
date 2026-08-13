from rest_framework import serializers
from .models import CustomerLedgerEntry


class CustomerLedgerEntrySerializer(serializers.ModelSerializer):
    ticket_ref = serializers.CharField(source='ticket.pnr', read_only=True, default='')
    customer_id = serializers.UUIDField(source='customer.id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')
    account_name = serializers.CharField(source='account.name', read_only=True, default='')

    class Meta:
        model = CustomerLedgerEntry
        fields = ['id', 'ticket', 'ticket_ref', 'customer', 'customer_id', 'customer_name',
                  'passenger_name', 'entry_type', 'amount_pkr', 'description', 'status', 'created_at',
                  'voucher_no', 'voucher_date', 'voucher_status', 'branch', 'payment_method',
                  'account', 'account_name', 'currency', 'exchange_rate', 'amount_sar',
                  'invoice_ref', 'cash_flow', 'advance_option']
        read_only_fields = ['id', 'created_at']
