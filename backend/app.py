import os
import re
import uuid
import shutil
import subprocess
import tempfile
import platform as os_platform
from pathlib import Path
from functools import wraps
from datetime import datetime

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import yt_dlp

load_dotenv()

app = Flask(__name__)
CORS(app)

# Konfiguracja
FLASK_SECRET = os.getenv('FLASK_SECRET', 'dev-secret')
VERCEL_SECRET = os.getenv('VERCEL_SECRET', 'dev-secret')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5001))

# Inicjalizacja Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Weryfikacja FFmpeg przy starcie
def check_ffmpeg():
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError("FFmpeg nie jest zainstalowany lub niedostępny w PATH")

try:
    check_ffmpeg()
    print("✓ FFmpeg dostępny")
except RuntimeError as e:
    print(f"✗ Błąd: {e}")
    exit(1)

# Dekorator do weryfikacji wewnętrznego sekretu
def require_internal(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        secret = request.headers.get('X-Internal-Secret')
        if secret != VERCEL_SECRET:
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function

def generate_short_code(length=5):
    """Generuje losowy kod z a-z, A-Z, 0-9"""
    import string
    chars = string.ascii_letters + string.digits
    return ''.join(__import__('random').choice(chars) for _ in range(length))

def get_font_path():
    """Zwraca ścieżkę do dostępnego fontów w systemie"""
    system = os_platform.system()
    if system == 'Windows':
        paths = [
            'C:\\Windows\\Fonts\\arial.ttf',
            'C:\\Windows\\Fonts\\Arial.ttf',
        ]
    elif system == 'Darwin':  # macOS
        paths = [
            '/Library/Fonts/Arial.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
        ]
    else:  # Linux
        paths = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        ]
    
    for path in paths:
        if Path(path).exists():
            return path
    
    # Fallback - użyj systemu bez jawnego fontu
    return None

def get_video_dimensions(video_path):
    """Pobiera wymiary wideo przez ffprobe"""
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=p=0',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        width, height = map(int, result.stdout.strip().split(','))
        return width, height
    except Exception as e:
        print(f"Błąd przy pobieraniu wymiarów: {e}")
        return 1920, 1080  # Fallback

def process_video(tiktok_url, short_code, submitter_nickname, admin_username):
    """Pobiera TikTok'a, watermarkuje, skleja z outro"""
    
    font_path = get_font_path()
    temp_dir = Path(f'/tmp/{short_code}')
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # KROK 1: Pobieranie przez yt-dlp
        print(f"[{short_code}] Pobieranie wideo z TikToka...")
        ydl_opts = {
            'outtmpl': str(temp_dir / 'original.mp4'),
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
            'merge_output_format': 'mp4',
            'quiet': False,
            'no_warnings': False,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([tiktok_url])
        
        original_path = temp_dir / 'original.mp4'
        if not original_path.exists():
            raise FileNotFoundError("Pobieranie wideo nie powiodło się")

        # KROK 2: Watermark
        print(f"[{short_code}] Nakładanie watermarku...")
        watermarked_path = temp_dir / 'watermarked.mp4'
        
        watermark_text = "drawtext=text='jajakosciotrupa.pl':fontcolor=white:fontsize=24:shadowcolor=black:shadowx=2:shadowy=2:x=20:y=h-40"
        if font_path:
            watermark_text += f":fontfile={font_path}"
        watermark_text += ":enable='between(t,0,duration)'"
        
        watermark_cmd = [
            'ffmpeg', '-i', str(original_path),
            '-vf', watermark_text,
            '-codec:a', 'aac', '-codec:v', 'libx264',
            '-preset', 'medium', '-crf', '23',
            str(watermarked_path),
            '-y'
        ]
        subprocess.run(watermark_cmd, check=True, capture_output=True)

        # KROK 3: Animacja końcowa (outro)
        print(f"[{short_code}] Generowanie outro...")
        width, height = get_video_dimensions(str(watermarked_path))
        outro_path = temp_dir / 'outro.mp4'
        
        # Przygotuj teksty
        text_lines = [
            ("jajakosciotrupa.pl", 42, True, "white", "(w-text_w)/2", "(h/2)-120"),
            ("Platforma: TikTok", 28, False, "white", "(w-text_w)/2", "(h/2)-50"),
            (f"Przeslal: {submitter_nickname}", 28, False, "white", "(w-text_w)/2", "(h/2)"),
            (f"Wrzucil: {admin_username}", 28, False, "white", "(w-text_w)/2", "(h/2)+50"),
            (f"link.jajakosciotrupa.pl/{short_code}", 24, False, "#aaaaaa", "(w-text_w)/2", "(h/2)+110"),
        ]
        
        filter_parts = []
        for text, fontsize, bold, color, x, y in text_lines:
            part = f"drawtext=text='{text}':fontcolor={color}:fontsize={fontsize}:x={x}:y={y}"
            if font_path:
                part += f":fontfile={font_path}"
            if bold:
                part += ":fontweight=bold"
            filter_parts.append(part)
        
        drawtext_filter = ", ".join(filter_parts)
        
        outro_cmd = [
            'ffmpeg', '-f', 'lavfi',
            '-i', f'color=c=black:size={width}x{height}:rate=30',
            '-vf', drawtext_filter,
            '-t', '4', '-an',
            str(outro_path),
            '-y'
        ]
        subprocess.run(outro_cmd, check=True, capture_output=True)

        # KROK 4: Sklejenie
        print(f"[{short_code}] Sklejanie wideo...")
        concat_txt = temp_dir / 'concat.txt'
        with open(concat_txt, 'w') as f:
            f.write(f"file '{watermarked_path}'\n")
            f.write(f"file '{outro_path}'\n")

        final_path = temp_dir / 'final.mp4'
        concat_cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', str(concat_txt),
            '-c', 'copy',
            str(final_path),
            '-y'
        ]
        subprocess.run(concat_cmd, check=True, capture_output=True)

        if not final_path.exists():
            raise FileNotFoundError("Sklejanie wideo nie powiodło się")

        print(f"[{short_code}] Wideo gotowe!")
        return final_path

    except Exception as e:
        print(f"[{short_code}] Błąd podczas przetwarzania: {e}")
        raise

# ============ ENDPOINTS ============

@app.route('/health', methods=['GET'])
def health():
    """Endpoint zdrowotny"""
    return jsonify({
        'status': 'ok',
        'yt_dlp_version': yt_dlp.version.__version__,
        'ffmpeg': 'ok'
    })

@app.route('/process', methods=['POST'])
@require_internal
def process():
    """
    Pobiera TikTok'a, watermarkuje, skleja z outro i zwraca MP4
    """
    try:
        data = request.get_json()
        tiktok_url = data.get('tiktok_url')
        short_code = data.get('short_code')
        submitter_nickname = data.get('submitter_nickname')
        admin_username = data.get('admin_username')

        if not all([tiktok_url, short_code, submitter_nickname, admin_username]):
            return jsonify({'error': 'Brakuje wymaganych pól'}), 400

        final_path = process_video(tiktok_url, short_code, submitter_nickname, admin_username)
        
        # Wysłanie pliku
        return send_file(
            final_path,
            as_attachment=True,
            download_name=f'{short_code}.mp4',
            mimetype='video/mp4'
        )

    except Exception as e:
        print(f"Błąd w /process: {e}")
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Czyszczenie temp folderu
        temp_dir = Path(f'/tmp/{short_code}')
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    print(f"🚀 Flask uruchamiany na porcie {FLASK_PORT}")
    app.run(debug=os.getenv('FLASK_ENV') == 'development', port=FLASK_PORT)
