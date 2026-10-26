# 원작 Unity 프로젝트의 NGUI 아틀라스에서 화면 구성 조각(테두리·버튼·아이콘)과 글꼴을 뽑아 assets/ui, assets/font에 저장한다.
# 사용법: python tools/build_ui.py        (Pillow, numpy 필요)
# 글꼴은 원본 그대로 복사하므로, 배포 전에 python tools/optimize_assets.py로 WOFF2로 줄인다.
import re
import shutil
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r'E:/LAO_Google_QA/Assets')
ATLAS = SRC / 'AssetBundleResource/Atlas'
OUT = ROOT / 'assets/ui'
FONT_OUT = ROOT / 'assets/font'

# 아틀라스 이름 → (프리팹, 텍스처)
ATLASES = {'master': ('masterAtlas', 'masterAtlas'), 'battle': ('BattleAtlas', 'Battle'), 'dialog2': ('DialogAtlas_v2', 'DialogAtlas_v2')}

# 저장 이름 → (아틀라스, 조각 이름)
SPRITES = {
    'btn_on': ('master', 'UI_LastStory_Stage_On'), 'btn_off': ('master', 'UI_LastStory_Stage_Off'),
    'btn_big_on': ('master', 'UI_Dailytraining_BTN04'), 'btn_big_off': ('master', 'UI_Dailytraining_BTN03'),
    'popup': ('dialog2', 'UI_Dialog_Popup_Frame'), 'popup_title': ('master', 'Bg_Popup_TitleBg'),
    'dlg_box': ('dialog2', 'UI_Dialog_Main_CharDialog_Frame_2'), 'dlg_name': ('dialog2', 'UI_Dialog_Main_CharDialog_Frame_CharName_2'),
    'panel': ('battle', 'UI_Battle_Info_Frame_log'), 'title_bg': ('master', 'UI__TitleBG'),
    'star_on': ('battle', 'UI_Battle_Main_missionclear_star_fill_2'), 'star_off': ('battle', 'UI_Battle_Main_missionclear_star_frame_2'),
    'hex_gold': ('master', 'UI_Lobby_Main_HUD_Hexagon_Shop'), 'hex_silver': ('master', 'UI_Lobby_Main_HUD_Hexagon_Trade'),
    'hex_purple': ('master', 'UI_Lobby_Main_HUD_Hexagon_event'),
}
# 카드 테두리: 등급별 원작 캐릭터 카드 틀 (안쪽 회색 바탕은 투명 처리)
for g in ['B', 'A', 'S', 'SS']:
    SPRITES[f'frame_{g}'] = ('master', f'UI_Common_CharaFrame_{g}')
# 역할·등급 아이콘: 공격기=검, 보호기=방패, 지원기=톱니
for role, icon in [('ATK', 'Sword'), ('DEF', 'Shield'), ('SUP', 'Gear')]:
    for g in ['B', 'A', 'S', 'SS']:
        SPRITES[f'role_{role}_{g}'] = ('battle', f'UI_Icon_CHA_{icon}{g}_Big')

FONTS = ['GodoB.ttf', 'GodoM.ttf', 'Exo2-Bold.otf', 'Exo2-ExtraBold.otf', 'Exo2-Black.otf']


def load_rects(prefab):
    t = (ATLAS / f'{prefab}.prefab').read_text(encoding='utf-8', errors='ignore')
    pat = r'- name: (.+)\n\s+x: (\d+)\n\s+y: (\d+)\n\s+width: (\d+)\n\s+height: (\d+)'
    return {m.group(1).strip(): tuple(map(int, m.groups()[1:])) for m in re.finditer(pat, t)}


def hollow(im):
    """카드 틀의 안쪽(채도가 낮은 회색 바탕)을 투명하게 만든다. 가장자리 5px과 색이 있는 장식은 남긴다."""
    a = np.array(im)
    rgb = a[..., :3].astype(int)
    sat = rgb.max(-1) - rgb.min(-1)
    h, w = sat.shape
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy])
    a[(sat < 40) & (edge > 4), 3] = 0
    return Image.fromarray(a)


def make_icons():
    """앱 아이콘: 오렌지에이드 초상화 얼굴 부분을 원작 노랑 테두리 육각형에 넣는다 (assets/art가 먼저 있어야 한다)"""
    from PIL import ImageDraw
    art = Image.open(ROOT / 'assets/art/PECS_Orangeade.webp').convert('RGBA')
    face = art.crop((60, 20, 420, 380)).resize((512, 512), Image.LANCZOS)
    hexagon = [(256, 8), (472, 132), (472, 380), (256, 504), (40, 380), (40, 132)]
    icon = Image.new('RGBA', (512, 512), (23, 24, 27, 255))
    mask = Image.new('L', (512, 512), 0)
    ImageDraw.Draw(mask).polygon(hexagon, fill=255)
    icon.paste(face, (0, 0), mask)
    ImageDraw.Draw(icon).line(hexagon + [hexagon[0]], fill=(255, 198, 0, 255), width=18, joint='curve')
    for size in (512, 192):
        icon.resize((size, size), Image.LANCZOS).save(OUT / f'icon-{size}.png', optimize=True)
    icon.resize((64, 64), Image.LANCZOS).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    FONT_OUT.mkdir(parents=True, exist_ok=True)
    cache = {}
    for key, (prefab, tex) in ATLASES.items():
        cache[key] = (load_rects(prefab), Image.open(ATLAS / f'{tex}.png').convert('RGBA'))
    for out, (atlas, name) in SPRITES.items():
        rects, im = cache[atlas]
        x, y, w, h = rects[name]
        sp = im.crop((x, y, x + w, y + h))
        if out.startswith('frame_'):
            sp = hollow(sp)
        sp.save(OUT / f'{out}.png', optimize=True)
    for f in FONTS:
        shutil.copy(SRC / 'font' / f, FONT_OUT / f)
    make_icons()
    print(f'ui built: {len(SPRITES)} sprites, {len(FONTS)} fonts, icons')


if __name__ == '__main__':
    main()
