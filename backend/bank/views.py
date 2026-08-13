from io import BytesIO
from django.db.models import Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from openpyxl import Workbook
from .models import BankAccount, BankTransaction
from .serializers import BankAccountSerializer, BankTransactionSerializer


def get_account():
    account, _ = BankAccount.objects.get_or_create(name='Main Account')
    return account


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def bank_summary(request):
    account_id = request.query_params.get('account_id')
    if account_id:
        try:
            account = BankAccount.objects.get(pk=account_id)
        except BankAccount.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        account = get_account()
    recent = BankTransaction.objects.filter(account=account)[:50]
    return Response({
        'account': BankAccountSerializer(account).data,
        'transactions': BankTransactionSerializer(recent, many=True).data,
    })


class BankAccountListView(generics.ListCreateAPIView):
    serializer_class = BankAccountSerializer
    queryset = BankAccount.objects.all().order_by('created_at')


class BankAccountDeleteView(generics.DestroyAPIView):
    serializer_class = BankAccountSerializer
    queryset = BankAccount.objects.all()

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        if account.transactions.exists():
            return Response({'error': 'Cannot delete an account that has transactions'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class BankTransactionListView(generics.ListAPIView):
    serializer_class = BankTransactionSerializer

    def get_queryset(self):
        account_id = self.request.query_params.get('account_id')
        if account_id:
            try:
                account = BankAccount.objects.get(pk=account_id)
            except BankAccount.DoesNotExist:
                return BankTransaction.objects.none()
        else:
            account = get_account()
        return BankTransaction.objects.filter(account=account)


class BankExcelExport(View):
    def get(self, request):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        account = get_account()
        transactions = BankTransaction.objects.filter(account=account).order_by('-created_at')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Bank Transactions'

        headers = ['Date', 'Type', 'Description', 'Amount (PKR)', 'Balance After (PKR)']
        ws.append(headers)
        for cell in ws[1]:
            cell.font = cell.font.copy(bold=True)

        for tx in transactions:
            ws.append([
                tx.created_at.strftime('%Y-%m-%d %H:%M'),
                tx.tx_type.title(),
                tx.description,
                float(tx.amount_pkr),
                float(tx.balance_after),
            ])

        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 14
        ws.column_dimensions['C'].width = 40
        ws.column_dimensions['D'].width = 18
        ws.column_dimensions['E'].width = 20

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="bank_transactions.xlsx"'
        return response
