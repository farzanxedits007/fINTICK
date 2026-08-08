from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view()),
    path('me/', views.CurrentUserView.as_view()),
    path('users/', views.UserListView.as_view()),
    path('dashboard/', views.dashboard_summary),
]
