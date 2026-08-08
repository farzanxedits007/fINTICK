from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/tickets/', include('tickets.urls')),
    path('api/ledger/customer/', include('customer_ledger.urls')),
    path('api/ledger/vendor/', include('vendor_ledger.urls')),
    path('api/bank/', include('bank.urls')),
]
