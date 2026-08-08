from rest_framework import serializers
from .models import VendorLedgerEntry


class VendorLedgerEntrySerializer(serializers.ModelSerializer):
    ticket_ref = serializers.CharField(source='ticket.pnr', read_only=True, default='')
    vendor_id = serializers.UUIDField(source='vendor.id', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default='')

    class Meta:
        model = VendorLedgerEntry
        fields = ['id', 'ticket', 'ticket_ref', 'vendor', 'vendor_id', 'vendor_name',
                  'passenger_name', 'entry_type', 'amount_pkr', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
