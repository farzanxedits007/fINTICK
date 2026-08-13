from django.urls import path
from . import views

urlpatterns = [
    path('', views.cash_summary, name='cash-summary'),
    path('transactions/', views.CashTransactionListView.as_view(), name='cash-transactions'),
    path('export/', views.CashExcelExport.as_view(), name='cash-excel-export'),
]
