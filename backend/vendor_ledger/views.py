from decimal import Decimal
from io import BytesIO
from django.db.models import Sum, Q, Value, DecimalField
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from openpyxl import Workbook
from .models import VendorLedgerEntry
from .serializers import VendorLedgerEntrySerializer
from pdf_export import ledger_pdf, payment_slip_pdf
from ledger_voucher import compute_pkr_amount, voucher_no_for, post_money, reverse_money


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
    from datetime import date as date_cls
    from datetime import datetime

    amount = Decimal(str(request.data.get('amount', 0)))
    passenger_name = request.data.get('passenger_name', '').strip()
    description = request.data.get('description', 'Payment made')
    ticket_id = request.data.get('ticket_id')
    vendor_id = request.data.get('vendor_id')

    payment_method = request.data.get('payment_method', 'bank')
    if payment_method not in ('bank', 'cash'):
        payment_method = 'bank'
    account_id = request.data.get('account_id')
    currency = (request.data.get('currency') or 'PKR').upper()
    if currency not in ('PKR', 'SAR'):
        currency = 'PKR'
    exchange_rate = Decimal(str(request.data.get('exchange_rate') or 0))
    amount_sar = Decimal(str(request.data.get('amount_sar') or 0))
    branch = request.data.get('branch') or 'Lahore'
    voucher_status = request.data.get('voucher_status') or 'final'
    invoice_ref = request.data.get('invoice_ref', '')
    cash_flow = request.data.get('cash_flow', 'Not Required')
    advance_option = request.data.get('advance_option', '')
    voucher_date = None
    raw_date = request.data.get('voucher_date')
    if raw_date:
        try:
            voucher_date = date_cls.fromisoformat(str(raw_date)[:10])
        except ValueError:
            try:
                voucher_date = datetime.strptime(str(raw_date)[:10], '%d/%m/%Y').date()
            except ValueError:
                voucher_date = None

    if currency == 'SAR':
        amount = compute_pkr_amount('SAR', amount, amount_sar, exchange_rate)

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
        voucher_date=voucher_date,
        voucher_status=voucher_status,
        branch=branch,
        payment_method=payment_method,
        currency=currency if currency == 'SAR' else 'PKR',
        exchange_rate=exchange_rate if currency == 'SAR' else Decimal('0'),
        amount_sar=amount_sar if currency == 'SAR' else Decimal('0'),
        invoice_ref=invoice_ref,
        cash_flow=cash_flow,
        advance_option=advance_option,
    )

    if payment_method == 'bank' and account_id:
        from bank.models import BankAccount
        try:
            entry.account = BankAccount.objects.get(pk=account_id)
        except BankAccount.DoesNotExist:
            entry.account = None
        entry.save(update_fields=['account'])

    entry.voucher_no = voucher_no_for(entry)
    entry.save(update_fields=['voucher_no'])

    post_money(payment_method, 'out', amount, description or f'Payment to vendor for {passenger_name}', 'vendor_ledger', entry.id, account_id)

    return Response(VendorLedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_vendor_entry(request, entry_id):
    try:
        entry = VendorLedgerEntry.objects.get(pk=entry_id)
    except VendorLedgerEntry.DoesNotExist:
        return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

    if entry.entry_type == 'debit':
        reverse_money(entry.payment_method or 'bank', 'vendor_ledger', entry.id)

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


class VendorPdfExport(View):
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

        rows = []
        for entry in qs:
            vendor_name = ''
            if entry.vendor:
                vendor_name = entry.vendor.name
            elif entry.ticket and entry.ticket.vendor:
                vendor_name = entry.ticket.vendor.name
            rows.append([
                entry.created_at.strftime('%Y-%m-%d %H:%M'),
                entry.passenger_name,
                entry.ticket.pnr if entry.ticket else '',
                vendor_name,
                entry.get_entry_type_display(),
                f'{entry.amount_pkr:,.2f}',
                entry.description,
                entry.get_status_display(),
            ])

        header = ['Date', 'Passenger', 'PNR', 'Vendor', 'Type', 'Amount (PKR)', 'Description', 'Status']
        title = 'Vendor Ledger'
        if vendor_id and rows:
            title = f'Vendor Ledger — {rows[0][3] or vendor_id}'
        subtitle = f'Generated {timezone.localtime().strftime("%Y-%m-%d %H:%M")}'
        buf = ledger_pdf(title, subtitle, header, rows)

        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="vendor_ledger.pdf"'
        return response


class VendorPaymentSlip(View):
    def get(self, request, entry_id):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        try:
            entry = VendorLedgerEntry.objects.select_related('ticket', 'vendor').get(pk=entry_id)
        except VendorLedgerEntry.DoesNotExist:
            return HttpResponse('Not found', status=404)

        slip_no = entry.voucher_no or f'SLP-{entry.id.hex[:8].upper()}'
        vendor_name = ''
        if entry.vendor:
            vendor_name = entry.vendor.name
        elif entry.ticket and entry.ticket.vendor:
            vendor_name = entry.ticket.vendor.name

        method = dict(VendorLedgerEntry._meta.get_field('payment_method').flatchoices).get(
            entry.payment_method, entry.payment_method or '—') if entry.payment_method else '—'
        voucher_date = entry.voucher_date.strftime('%Y-%m-%d') if entry.voucher_date else entry.created_at.strftime('%Y-%m-%d %H:%M')

        fields = [
            ('Voucher No', slip_no),
            ('Date', voucher_date),
            ('Voucher Status', entry.voucher_status.capitalize()),
            ('Branch', entry.branch or '—'),
            ('Type', 'Payment Made'),
            ('Passenger', entry.passenger_name),
            ('Vendor', vendor_name or '—'),
            ('Paid In', 'Cash' if entry.payment_method == 'cash' else 'Bank'),
            ('Account', entry.account.name if entry.account else '—'),
            ('Currency', entry.currency or 'PKR'),
            ('Exchange Rate', f'{entry.exchange_rate:,.2f}' if entry.currency == 'SAR' else '—'),
            ('Amount (SAR)', f'{entry.amount_sar:,.2f}' if entry.currency == 'SAR' else '—'),
            ('PNR', entry.ticket.pnr if entry.ticket else '—'),
            ('Invoice Ref', entry.invoice_ref or '—'),
            ('Description', entry.description),
            ('Status', entry.get_status_display()),
        ]
        buf = payment_slip_pdf('FinTick', slip_no, fields, f'{entry.amount_pkr:,.2f}')

        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="slip_{entry.id.hex[:8]}.pdf"'
        return response
