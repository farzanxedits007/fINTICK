from django.urls import path
from . import views

urlpatterns = [
    path('', views.bank_summary, name='bank-summary'),
    path('accounts/', views.BankAccountListView.as_view(), name='bank-accounts'),
    path('accounts/<uuid:pk>/', views.BankAccountDeleteView.as_view(), name='bank-account-delete'),
    path('transactions/', views.BankTransactionListView.as_view(), name='bank-transactions'),
    path('export/', views.BankExcelExport.as_view(), name='bank-excel-export'),
]
