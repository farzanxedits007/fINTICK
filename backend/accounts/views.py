from rest_framework import generics
from .models import Customer, Vendor
from .serializers import CustomerSerializer, VendorSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = Customer.objects.all()
        q = self.request.query_params.get('q', '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(phone__icontains=q) |
                Q(email__icontains=q)
            )
        active = self.request.query_params.get('active')
        if active is not None:
            qs = qs.filter(is_active=active == 'true')
        return qs


class VendorListCreateView(generics.ListCreateAPIView):
    serializer_class = VendorSerializer

    def get_queryset(self):
        qs = Vendor.objects.all()
        q = self.request.query_params.get('q', '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(company__icontains=q) |
                Q(phone__icontains=q) |
                Q(email__icontains=q)
            )
        active = self.request.query_params.get('active')
        if active is not None:
            qs = qs.filter(is_active=active == 'true')
        return qs


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()


class VendorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VendorSerializer
    queryset = Vendor.objects.all()
