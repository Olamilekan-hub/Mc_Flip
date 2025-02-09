import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK (Replace with your Firebase credentials JSON)
cred = credentials.Certificate("config/serviceAccount.json")  
firebase_admin.initialize_app(cred)

# Get Firestore database instance
db = firestore.client()
