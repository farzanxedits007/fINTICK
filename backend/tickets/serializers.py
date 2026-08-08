from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default='')

    class Meta:
        model = Ticket
        fields = [
            'id', 'customer', 'customer_name', 'vendor', 'vendor_name',
            'passenger_name', 'passport_no', 'date_of_birth',
            'passport_expiry', 'gender', 'pnr', 'flight_date', 'airline',
            'vendor_cost_pkr', 'ticket_price_pkr', 'profit_pkr',
            'status', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'profit_pkr', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ''
