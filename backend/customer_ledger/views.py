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
from .models import CustomerLedgerEntry
from .serializers import CustomerLedgerEntrySerializer
from pdf_export import ledger_pdf, payment_slip_pdf
from ledger_voucher import compute_pkr_amount, voucher_no_for, post_money, reverse_money, DEFAULT_RATE


class CustomerLedgerListView(generics.ListAPIView):
    serializer_class = CustomerLedgerEntrySerializer

    def get_queryset(self):
        qs = CustomerLedgerEntry.objects.select_related('ticket', 'ticket__customer', 'customer')
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(passenger_name__icontains=q) |
                Q(ticket__passport_no__icontains=q)
            )
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            qs = qs.filter(Q(ticket__customer_id=customer_id) | Q(customer_id=customer_id))
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_summary(request):
    qs = CustomerLedgerEntry.objects.all()
    customer_id = request.query_params.get('customer_id')
    if customer_id:
        qs = qs.filter(Q(ticket__customer_id=customer_id) | Q(customer_id=customer_id))

    total_debit = qs.filter(entry_type='debit').aggregate(
        total=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['total']

    total_credit = qs.filter(entry_type='credit').aggregate(
        total=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['total']

    outstanding = total_debit - total_credit
    paid = total_credit

    return Response({
        'total_receivable': str(total_debit),
        'total_collected': str(total_credit),
        'outstanding': str(max(outstanding, Decimal('0'))),
        'paid': str(paid),
        'net_balance': str(outstanding),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_customer_payment(request):
    from datetime import date as date_cls
    from datetime import datetime

    amount = Decimal(str(request.data.get('amount', 0)))
    passenger_name = request.data.get('passenger_name', '').strip()
    description = request.data.get('description', 'Payment received')
    ticket_id = request.data.get('ticket_id')
    customer_id = request.data.get('customer_id')

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

    customer = None
    if customer_id:
        from accounts.models import Customer
        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

    entry = CustomerLedgerEntry.objects.create(
        ticket=ticket,
        customer=customer,
        passenger_name=passenger_name,
        entry_type=CustomerLedgerEntry.EntryType.CREDIT,
        amount_pkr=amount,
        description=description,
        status=CustomerLedgerEntry.Status.PAID,
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

    post_money(payment_method, 'in', amount, description or f'Payment from {passenger_name}', 'customer_ledger', entry.id, account_id)

    if ticket is not None and ticket.status != 'cancelled':
        ticket.status = 'paid'
        ticket.save(update_fields=['status', 'updated_at'])

    return Response(CustomerLedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_customer_entry(request, entry_id):
    try:
        entry = CustomerLedgerEntry.objects.get(pk=entry_id)
    except CustomerLedgerEntry.DoesNotExist:
        return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

    if entry.entry_type == 'credit':
        reverse_money(entry.payment_method or 'bank', 'customer_ledger', entry.id)
        if entry.ticket is not None:
            remaining = CustomerLedgerEntry.objects.filter(
                ticket=entry.ticket, entry_type='credit'
            ).exclude(pk=entry.id).exists()
            if not remaining and entry.ticket.status == 'paid':
                entry.ticket.status = 'confirmed'
                entry.ticket.save(update_fields=['status', 'updated_at'])

    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerExcelExport(View):
    def get(self, request):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        qs = CustomerLedgerEntry.objects.select_related('ticket', 'ticket__customer', 'customer').order_by('-created_at')
        customer_id = request.GET.get('customer_id')
        if customer_id:
            qs = qs.filter(Q(ticket__customer_id=customer_id) | Q(customer_id=customer_id))

        wb = Workbook()
        ws = wb.active
        ws.title = 'Customer Ledger'

        headers = ['Date', 'Passenger', 'PNR', 'Customer', 'Type', 'Amount (PKR)', 'Description', 'Status']
        ws.append(headers)
        for cell in ws[1]:
            cell.font = cell.font.copy(bold=True)

        for entry in qs:
            customer_name = ''
            if entry.customer:
                customer_name = entry.customer.name
            elif entry.ticket and entry.ticket.customer:
                customer_name = entry.ticket.customer.name

            ws.append([
                entry.created_at.strftime('%Y-%m-%d %H:%M'),
                entry.passenger_name,
                entry.ticket.pnr if entry.ticket else '',
                customer_name,
                entry.get_entry_type_display(),
                float(entry.amount_pkr),
                entry.description,
                entry.get_status_display(),
            ])

        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 22
        ws.column_dimensions['C'].width = 16
        ws.column_dimensions['D'].width = 22
        ws.column_dimensions['E'].width = 12
        ws.column_dimensions['F'].width = 18
        ws.column_dimensions['G'].width = 35
        ws.column_dimensions['H'].width = 14

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="customer_ledger.xlsx"'
        return response


class CustomerPdfExport(View):
    def get(self, request):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        qs = CustomerLedgerEntry.objects.select_related('ticket', 'ticket__customer', 'customer').order_by('-created_at')
        customer_id = request.GET.get('customer_id')
        if customer_id:
            qs = qs.filter(Q(ticket__customer_id=customer_id) | Q(customer_id=customer_id))

        rows = []
        for entry in qs:
            customer_name = ''
            if entry.customer:
                customer_name = entry.customer.name
            elif entry.ticket and entry.ticket.customer:
                customer_name = entry.ticket.customer.name
            rows.append([
                entry.created_at.strftime('%Y-%m-%d %H:%M'),
                entry.passenger_name,
                entry.ticket.pnr if entry.ticket else '',
                customer_name,
                entry.get_entry_type_display(),
                f'{entry.amount_pkr:,.2f}',
                entry.description,
                entry.get_status_display(),
            ])

        header = ['Date', 'Passenger', 'PNR', 'Customer', 'Type', 'Amount (PKR)', 'Description', 'Status']
        title = 'Customer Ledger'
        if customer_id and rows:
            title = f'Customer Ledger — {rows[0][3] or customer_id}'
        subtitle = f'Generated {timezone.localtime().strftime("%Y-%m-%d %H:%M")}'
        buf = ledger_pdf(title, subtitle, header, rows)

        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="customer_ledger.pdf"'
        return response


class CustomerPaymentSlip(View):
    def get(self, request, entry_id):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        try:
            entry = CustomerLedgerEntry.objects.select_related('ticket', 'customer').get(pk=entry_id)
        except CustomerLedgerEntry.DoesNotExist:
            return HttpResponse('Not found', status=404)

        slip_no = entry.voucher_no or f'SLP-{entry.id.hex[:8].upper()}'
        customer_name = ''
        if entry.customer:
            customer_name = entry.customer.name
        elif entry.ticket and entry.ticket.customer:
            customer_name = entry.ticket.customer.name

        method = dict(CustomerLedgerEntry._meta.get_field('payment_method').flatchoices).get(
            entry.payment_method, entry.payment_method or '—') if entry.payment_method else '—'
        voucher_date = entry.voucher_date.strftime('%Y-%m-%d') if entry.voucher_date else entry.created_at.strftime('%Y-%m-%d %H:%M')

        fields = [
            ('Voucher No', slip_no),
            ('Date', voucher_date),
            ('Voucher Status', entry.voucher_status.capitalize()),
            ('Branch', entry.branch or '—'),
            ('Type', 'Payment Received'),
            ('Passenger', entry.passenger_name),
            ('Customer', customer_name or '—'),
            ('Received In', 'Cash' if entry.payment_method == 'cash' else 'Bank'),
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
