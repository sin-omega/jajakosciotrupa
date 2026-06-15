#!/usr/bin/env python3
"""
Skrypt do stworzenia pierwszego admina
Użycie: python seed_admin.py <username> <password>
"""

import sys
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import bcrypt

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Błąd: SUPABASE_URL i SUPABASE_KEY muszą być ustawione w .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin(username: str, password: str):
    """Tworzy nowego admina z hashowanym hasłem"""
    try:
        # Haszowanie hasła z bcrypt
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Wstawienie do bazy
        response = supabase.table('admins').insert({
            'username': username,
            'password_hash': password_hash
        }).execute()
        
        print(f"✅ Admin '{username}' utworzony pomyślnie!")
        return True
    
    except Exception as e:
        print(f"❌ Błąd: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Użycie: python seed_admin.py <username> <password>")
        print("Przykład: python seed_admin.py admin123 moje_tajne_haslo")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    if len(username) < 3:
        print("❌ Username musi mieć co najmniej 3 znaki")
        sys.exit(1)
    
    if len(password) < 6:
        print("❌ Hasło musi mieć co najmniej 6 znaków")
        sys.exit(1)
    
    create_admin(username, password)
