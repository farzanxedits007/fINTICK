import os
import sys

# Path to your Django project (where manage.py lives)
path = '/home/fazimentor/fintik/backend'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'fintik.settings'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'fazimentor.pythonanywhere.com'
# Set a real secret key: generate one at https://djecrety.ir
os.environ['SECRET_KEY'] = 'CHANGE-ME'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
