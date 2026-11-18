import sys
import os

# Add root directory to sys.path so modules (db, matcher, models, mobility_app) can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from mobility_app import app

# Vercel looks for the ASGI/WSGI application object 'app'
