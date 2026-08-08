from django.urls import path
from . import views

urlpatterns = [
    path('', views.VendorLedgerListView.as_view(), name='vendor-ledger-list'),
    path('summary/', views.vendor_summary, name='vendor-ledger-summary'),
    path('add-payment/', views.add_vendor_payment, name='vendor-add-payment'),
    path('<uuid:entry_id>/delete/', views.delete_vendor_entry, name='vendor-delete-entry'),
    path('export/', views.VendorExcelExport.as_view(), name='vendor-excel-export'),
]
