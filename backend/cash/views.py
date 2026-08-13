from io import BytesIO
from django.db.models import Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.views import View
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from openpyxl import Workbook
from .models import CashTransaction
from .serializers import CashAccountSerializer, CashTransactionSerializer
from .services import get_cash_account


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cash_summary(request):
    account = get_cash_account()
    recent = CashTransaction.objects.filter(account=account)[:50]
    return Response({
        'account': CashAccountSerializer(account).data,
        'transactions': CashTransactionSerializer(recent, many=True).data,
    })


class CashTransactionListView(generics.ListAPIView):
    serializer_class = CashTransactionSerializer

    def get_queryset(self):
        account = get_cash_account()
        return CashTransaction.objects.filter(account=account)


class CashExcelExport(View):
    def get(self, request):
        auth = JWTAuthentication()
        try:
            user, _ = auth.authenticate(request)
        except Exception:
            return HttpResponse('Unauthorized', status=401)
        if user is None:
            return HttpResponse('Unauthorized', status=401)

        account = get_cash_account()
        transactions = CashTransaction.objects.filter(account=account).order_by('-created_at')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Cash Transactions'

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
        response['Content-Disposition'] = 'attachment; filename="cash_transactions.xlsx"'
        return response
