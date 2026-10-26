# 배포용 자원 최적화: 효과음 WAV → MP3, 배경음악 256kbps → 약 140kbps, 글꼴 TTF/OTF → 필요한 글자만 담은 WOFF2
# 사용법: python tools/optimize_assets.py     (soundfile, fonttools, brotli 필요)
# build_assets.py / build_ui.py로 원본을 다시 만든 뒤 실행한다.
from pathlib import Path
import soundfile as sf
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / 'assets/sfx'
BGM = ROOT / 'assets/bgm'
FONT = ROOT / 'assets/font'


def convert_sfx():
    for wav in sorted(SFX.glob('*.wav')):
        data, rate = sf.read(wav, always_2d=True)
        mp3 = wav.with_suffix('.mp3')
        sf.write(mp3, data, rate, format='MP3')
        wav.unlink()
        print(f'{wav.name} → {mp3.name} ({mp3.stat().st_size // 1024}KB)')


def compress_bgm():
    # 원본(약 256kbps)만 다시 압축한다. 이미 줄인 파일은 건너뛴다.
    for mp3 in sorted(BGM.glob('*.mp3')):
        data, rate = sf.read(mp3, always_2d=True)
        kbps = mp3.stat().st_size * 8 / (len(data) / rate) / 1000
        if kbps < 180:
            continue
        tmp = mp3.with_suffix('.tmp.mp3')
        sf.write(tmp, data, rate, format='MP3', compression_level=0.5, bitrate_mode='VARIABLE')
        tmp.replace(mp3)
        print(f'{mp3.name}: {kbps:.0f}kbps → {mp3.stat().st_size * 8 / (len(data) / rate) / 1000:.0f}kbps')


def font_text():
    """게임에 쓰이는 글자: 자주 쓰는 한글 2,350자(KS X 1001) + 소스에 나오는 모든 글자 + 기본 라틴 문자"""
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for b1 in range(0xB0, 0xC9):
        for b2 in range(0xA1, 0xFF):
            try:
                chars.add(bytes([b1, b2]).decode('euc-kr'))
            except UnicodeDecodeError:
                pass
    for f in [*ROOT.glob('js/*.js'), ROOT / 'index.html']:
        chars.update(f.read_text(encoding='utf-8'))
    chars.update('…·—–“”‘’「」『』▶◀▲▼★☆♥⚔')
    return ''.join(sorted(c for c in chars if not c.isspace() or c == ' '))


def subset_fonts():
    text = font_text()
    for src in sorted([*FONT.glob('*.ttf'), *FONT.glob('*.otf')]):
        font = TTFont(src)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        sub = subset.Subsetter(options=opts)
        sub.populate(text=text)
        sub.subset(font)
        out = src.with_suffix('.woff2')
        font.flavor = 'woff2'
        font.save(out)
        src.unlink()
        print(f'{src.name} → {out.name} ({out.stat().st_size // 1024}KB)')


if __name__ == '__main__':
    convert_sfx()
    compress_bgm()
    subset_fonts()
