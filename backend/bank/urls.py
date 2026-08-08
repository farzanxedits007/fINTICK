from django.urls import path
from . import views

urlpatterns = [
    path('', views.bank_summary, name='bank-summary'),
    path('transactions/', views.BankTransactionListView.as_view(), name='bank-transactions'),
    path('export/', views.BankExcelExport.as_view(), name='bank-excel-export'),
]
