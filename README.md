# jajakosciotrupa.pl

Platforma do oceny śmiesznych filmów z TikToka. Architektura dwuczęściowa: Next.js frontend na Vercel + Python Flask backend.

## 📋 Wymagania

### Ogólne
- **Node.js** 18+ (dla frontendu)
- **Python** 3.11+ (dla backendu)
- **FFmpeg** zainstalowany w systemie i dostępny w PATH
- Konto **Supabase** (baza PostgreSQL)
- Konto **Vercel** (hosting frontendu)

### Instalacja FFmpeg
**Windows:**
```bash
# Pobierz z https://ffmpeg.org/download.html
# lub użyj Chocolatey:
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

Weryfikacja:
```bash
ffmpeg -version
```

## 🗄️ Setup Bazy Danych (Supabase)

1. Przejdź na [supabase.com](https://supabase.com) i utwórz nowy projekt
2. Skopiuj URL i API key
3. W konsoli SQL Supabase wklej zawartość `database/schema.sql`
4. Schemę przesyłamy jako SQL query

## 🚀 Setup Backendu (Python Flask)

```bash
cd backend

# Utwórz virtual environment
python -m venv venv

# Aktywuj venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Zainstaluj zależności
pip install -r requirements.txt

# Utwórz .env
cp .env.example .env
```

Edytuj `backend/.env`:
```
FLASK_SECRET=your-random-secret-key
VERCEL_SECRET=your-shared-secret-with-frontend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-api-key
FLASK_ENV=development
FLASK_PORT=5001
```

### Tworzenie Pierwszego Admina

```bash
# Terminal w backend/
python seed_admin.py admin123 haslo123
```

Wynik:
```
✅ Admin 'admin123' utworzony pomyślnie!
```

### Uruchomienie Backendu

```bash
python app.py
```

Powinno wyświetlić:
```
✓ FFmpeg dostępny
🚀 Flask uruchamiany na porcie 5001
```

Testowanie health check'u:
```bash
curl http://localhost:5001/health
```

## 🎨 Setup Frontendu (Next.js)

```bash
cd frontend

# Zainstaluj zależności
npm install

# Utwórz .env.local
cp .env.local.example .env.local
```

Edytuj `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-random-jwt-secret
FLASK_URL=http://localhost:5001
VERCEL_SECRET=your-shared-secret-with-backend
```

### Uruchomienie w Development

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000)

### Build Produkcyjny

```bash
npm run build
npm start
```

## 📦 Deploy

### Frontend — Vercel

```bash
# Z folderu frontend/
npm install -g vercel
vercel --prod
```

Po deploymencie zaktualizuj zmienną:
```
FLASK_URL=https://flask.jajakosciotrupa.pl
```

w Vercel Project Settings → Environment Variables

### Backend — Railway (lub inny VPS)

Opcja 1: **Railway.app**
```bash
# Zainstaluj Railway CLI
npm i -g @railway/cli

# Zaloguj się
railway login

# Deploy
railway up
```

Opcja 2: **Własny VPS**
```bash
# SSH do serwera
ssh user@your-vps.com

# Sklonuj repo
git clone <repo-url>
cd jajakosciotrupa/backend

# Utwórz venv i zainstaluj
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Edytuj .env (produkcyjne wartości)

# Uruchom z gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

Zainstaluj systemowy serwis (systemd na Linuxie):
```
[Unit]
Description=jajakosciotrupa Flask API
After=network.target

[Service]
User=www-data
WorkingDirectory=/home/user/jajakosciotrupa/backend
Environment="PATH=/home/user/jajakosciotrupa/backend/venv/bin"
ExecStart=/home/user/jajakosciotrupa/backend/venv/bin/gunicorn -w 4 -b 0.0.0.0:5001 app:app

[Install]
WantedBy=multi-user.target
```

## 🔧 Struktura Projektu

```
/
├── frontend/              # Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.tsx       # Strona główna
│   │   ├── admin/
│   │   │   ├── login/     # Logowanie
│   │   │   ├── queue/     # Ocenianie filmów
│   │   │   └── history/   # Historia
│   │   └── api/           # API routes
│   ├── lib/
│   │   └── supabase.ts    # Klient Supabase
│   └── middleware.ts      # Ochrona tras
│
├── backend/               # Flask API
│   ├── app.py            # Główna aplikacja
│   ├── seed_admin.py     # Seeding admina
│   ├── requirements.txt
│   └── .env
│
└── database/
    └── schema.sql        # Schemat PostgreSQL
```

## 🎮 Używanie Platformy

### Dla Użytkowników
1. Odwiedź [jajakosciotrupa.pl](https://jajakosciotrupa.pl)
2. Wklej link do TikToka
3. Podaj swoją ksywę
4. Otrzymaj skrócony link: `link.jajakosciotrupa.pl/[kod]`

### Dla Adminów
1. Zaloguj się na [jajakosciotrupa.pl/admin/login](https://jajakosciotrupa.pl/admin/login)
2. Przejdź do **Kolejka** — oceniaj filmy
3. Klawiszowe skróty:
   - **D** lub **→** = ŚMIESZNE
   - **A** lub **←** = NIEŚMIESZNE
   - **P** = POBIERZ (z przetwarzaniem)
4. W **Historii** przeglądzaj wszystkie ocenione filmy

## 🎬 Przetwarzanie Wideo

Gdy admin kliknie **POBIERZ**:
1. Frontend wysyła request do backendu
2. Flask pobiera TikTok'a przez yt-dlp
3. Nałóż watermark: "jajakosciotrupa.pl"
4. Dodaj outro (4 sekundy) z metadanymi
5. Klej wideo: original + outro
6. Zwróć MP4 jako download

Całość zajmuje ~30-120 sekund w zależności od długości TikToka.

## 🔐 Bezpieczeństwo

- JWT tokeny 24h z `httpOnly` cookies
- Wewnętrzne requesty Flask chronione `X-Internal-Secret`
- Strict TypeScript mode
- Service key Supabase tylko server-side

## 📝 Zmienne Środowiskowe

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL         # Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Klucz anonimowy
SUPABASE_SERVICE_KEY              # Klucz serwisowy (server-side)
JWT_SECRET                        # Hasło do JWT (min 32 znaki)
FLASK_URL                         # URL backendu
VERCEL_SECRET                     # Wspólny sekret
```

### Backend (.env)
```
FLASK_SECRET                      # Hasło Flask
VERCEL_SECRET                     # Wspólny sekret (taki sam co frontend)
SUPABASE_URL                      # Supabase URL
SUPABASE_KEY                      # Supabase API key
FLASK_ENV                         # development/production
FLASK_PORT                        # Port (domyślnie 5001)
```

## 🐛 Troubleshooting

**FFmpeg nie znaleziony**
```
RuntimeError: FFmpeg nie jest zainstalowany
```
→ Zainstaluj FFmpeg i dodaj do PATH

**Błąd Supabase CONNECTION**
```
Error: Invalid connection
```
→ Sprawdź SUPABASE_URL i SUPABASE_KEY

**JWT authentication failed**
```
Unauthorized
```
→ Wyczyść cookies lub zaloguj się ponownie

**yt-dlp error: Video unavailable**
```
ERROR: The uploader has not made this video available in your country
```
→ TikTok może być zablokowany/niedostępny

## 📞 Support

Problemy? Sprawy do zrobienia:
- [ ] Uruchom `python seed_admin.py` w backendu
- [ ] Sprawdź czy FFmpeg działa (`ffmpeg -version`)
- [ ] Sprawdź logi Flask i Next.js
- [ ] Zweryfikuj zmienne .env

---

**Wersja**: 1.0.0  
**Data**: 2025  
**Licencja**: MIT
