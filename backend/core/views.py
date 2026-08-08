from django.db.models import Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, LoginSerializer


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    search_fields = ['username', 'first_name', 'last_name']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    from customer_ledger.models import CustomerLedgerEntry
    from vendor_ledger.models import VendorLedgerEntry
    from tickets.models import Ticket
    from accounts.models import Customer, Vendor
    from bank.services import get_account

    cust = CustomerLedgerEntry.objects.all()
    cust_debit = cust.filter(entry_type='debit').aggregate(
        t=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['t']
    cust_credit = cust.filter(entry_type='credit').aggregate(
        t=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['t']
    cust_outstanding = cust_debit - cust_credit

    vend = VendorLedgerEntry.objects.all()
    vend_credit = vend.filter(entry_type='credit').aggregate(
        t=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['t']
    vend_debit = vend.filter(entry_type='debit').aggregate(
        t=Coalesce(Sum('amount_pkr'), Value(0, output_field=DecimalField()))
    )['t']
    vend_outstanding = vend_credit - vend_debit

    total_tickets = Ticket.objects.count()
    total_profit = Ticket.objects.aggregate(
        t=Coalesce(Sum('profit_pkr'), Value(0, output_field=DecimalField()))
    )['t']

    return Response({
        'total_receivable': str(cust_debit),
        'total_collected': str(cust_credit),
        'customer_outstanding': str(cust_outstanding),
        'total_payable': str(vend_credit),
        'total_paid': str(vend_debit),
        'vendor_outstanding': str(vend_outstanding),
        'net_balance': str(cust_debit - cust_credit),
        'total_profit': str(total_profit),
        'bank_balance': str(get_account().balance),
        'total_tickets': total_tickets,
        'total_customers': Customer.objects.count(),
        'total_vendors': Vendor.objects.count(),
    })
