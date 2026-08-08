from django.urls import path
from . import views

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket-list'),
    path('<uuid:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
]
