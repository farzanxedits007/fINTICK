from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Ticket
from .serializers import TicketSerializer


class TicketListView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('created_by')
        q = self.request.query_params.get('q', '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(passenger_name__icontains=q) |
                Q(passport_no__icontains=q) |
                Q(pnr__icontains=q) |
                Q(airline__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        ticket = serializer.save(created_by=self.request.user)
        from customer_ledger.services import post_to_customer_ledger
        from vendor_ledger.services import post_to_vendor_ledger
        post_to_customer_ledger(ticket)
        post_to_vendor_ledger(ticket)


class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketSerializer
    queryset = Ticket.objects.select_related('created_by')
