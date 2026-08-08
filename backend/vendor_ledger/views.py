from decimal import Decimal
from io import BytesIO
from django.db.models import Sum, Q, Value, DecimalField
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from openpyxl import Workbook
from .models import VendorLedgerEntry
from .serializers import VendorLedgerEntrySerializer
from bank.services import withdraw as bank_withdraw, reverse_by_reference


class VendorLedgerListView(generics.ListAPIView):
    serializer_class = VendorLedgerEntrySerializer

    def get_queryset(self):
        qs = VendorLedgerEntry.objects.select_related('ticket', 'ticket__vendor', 'vendor')
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(passenger_name__icontains=q) |
                Q(ticket__passport_no__icontains=q)
            )
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        vendor_id = self.request.query_params.get('vendor_id')
        if vendor_id:
            qs = qs.filter(Q(ticket__vendor_id=vendor_id) | Q(vendor_id=vendor_id))
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vendor_summary(request):
    qs = VendorLedgerEntry.objects.all()
    vendor_id = request.query_params.get('vendor_id')
    if vendor_id:
        qs = qs.filter(Q(ticket__vendor_id=vendor_id) | Q(vendor_id=vendor_id))

    total_credit = qs.filter(entry_type='credit').aggregate(
        total=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['total']

    total_debit = qs.filter(entry_type='debit').aggregate(
        total=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['total']

    outstanding = total_credit - total_debit
    paid = total_debit

    return Response({
        'total_payable': str(total_credit),
        'total_paid': str(total_debit),
        'outstanding': str(max(outstanding, Decimal('0'))),
        'paid': str(paid),
        'net_balance': str(outstanding),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_vendor_payment(request):
    amount = Decimal(str(request.data.get('amount', 0)))
    passenger_name = request.data.get('passenger_name', '').strip()
    description = request.data.get('description', 'Payment made')
    ticket_id = request.data.get('ticket_id')
    vendor_id = request.data.get('vendor_id')

    if amount <= 0:
        return Response({'error': 'Amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    if not passenger_name:
        return Response({'error': 'Passenger name is required'}, status=status.HTTP_400_BAD_REQUEST)

    ticket = None
    if ticket_id:
        from tickets.models import Ticket
        try:
            ticket = Ticket.objects.get(pk=ticket_id)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

    vendor = None
    if vendor_id:
        from accounts.models import Vendor
        try:
            vendor = Vendor.objects.get(pk=vendor_id)
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=status.HTTP_404_NOT_FOUND)

    entry = VendorLedgerEntry.objects.create(
        ticket=ticket,
        vendor=vendor,
        passenger_name=passenger_name,
        entry_type=VendorLedgerEntry.EntryType.DEBIT,
        amount_pkr=amount,
        description=description,
        status=VendorLedgerEntry.Status.PAID,
    )

    bank_withdraw(amount, description or f'Payment to vendor for {passenger_name}', 'vendor_ledger', entry.id)

    return Response(VendorLedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_vendor_entry(request, entry_id):
    try:
        entry = VendorLedgerEntry.objects.get(pk=entry_id)
    except VendorLedgerEntry.DoesNotExist:
        return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

    if entry.entry_type == 'debit':
        reverse_by_reference('vendor_ledger', entry.id)

    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class VendorExcelExport(View):
    def get(self, request):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        qs = VendorLedgerEntry.objects.select_related('ticket', 'ticket__vendor', 'vendor').order_by('-created_at')
        vendor_id = request.GET.get('vendor_id')
        if vendor_id:
            qs = qs.filter(Q(ticket__vendor_id=vendor_id) | Q(vendor_id=vendor_id))

        wb = Workbook()
        ws = wb.active
        ws.title = 'Vendor Ledger'

        headers = ['Date', 'Passenger', 'PNR', 'Vendor', 'Type', 'Amount (PKR)', 'Description', 'Status']
        ws.append(headers)
        for cell in ws[1]:
            cell.font = cell.font.copy(bold=True)

        for entry in qs:
            vendor_name = ''
            if entry.vendor:
                vendor_name = entry.vendor.name
            elif entry.ticket and entry.ticket.vendor:
                vendor_name = entry.ticket.vendor.name

            ws.append([
                entry.created_at.strftime('%Y-%m-%d %H:%M'),
                entry.passenger_name,
                entry.ticket.pnr if entry.ticket else '',
                vendor_name,
                entry.get_entry_type_display(),
                float(entry.amount_pkr),
                entry.description,
                entry.get_status_display(),
            ])

        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 22
        ws.column_dimensions['C'].width = 16
        ws.column_dimensions['D'].width = 22
        ws.column_dimensions['E'].width = 14
        ws.column_dimensions['F'].width = 18
        ws.column_dimensions['G'].width = 35
        ws.column_dimensions['H'].width = 14

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="vendor_ledger.xlsx"'
        return response
