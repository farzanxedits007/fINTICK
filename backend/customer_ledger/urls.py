from django.urls import path
from . import views

urlpatterns = [
    path('', views.CustomerLedgerListView.as_view(), name='customer-ledger-list'),
    path('summary/', views.customer_summary, name='customer-ledger-summary'),
    path('add-payment/', views.add_customer_payment, name='customer-add-payment'),
    path('<uuid:entry_id>/delete/', views.delete_customer_entry, name='customer-delete-entry'),
    path('export/', views.CustomerExcelExport.as_view(), name='customer-excel-export'),
]
