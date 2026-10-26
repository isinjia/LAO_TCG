# 원작 Unity 프로젝트(E:/LAO/Google_QA)에서 게임에 필요한 에셋을 복사·가공한다.
# 사용법: python tools/build_assets.py        (카드 아트는 tools/build_art.py가 담당)
import shutil
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
A = Path(r'E:/LAO/Google_QA/Assets/AssetBundleResource')
SUB = Path(r'E:/LAO/Google_QA/Assets/AssetBundleResourceSub')
OUT = ROOT / 'assets'

BG = {  # 배경: 1920x1080 jpg (와이드 원본은 16:9 중앙 크롭)
    'board': A / 'Texture/BGImg/BG_10_1.png', 'title': A / 'Texture/BGImg/BG_13_32.png', 'deck': A / 'Texture/BGImg/BG_09_1.png',
    'camp_day': A / 'Texture/BGImg/BG_Camp1.png', 'camp_night': A / 'Texture/BGImg/BG_Camp3.png', 'snow': A / 'Texture/BGImg/BG_13_5.png',
    'snow_night': A / 'Texture/BGImg/BG_13_6.png', 'barracks': A / 'Texture/BGImg/BG_Cabin_01.png', 'mansion': A / 'Texture/BGImg/BG_12_2.png',
    'mansion_dark': A / 'Texture/BGImg/BG_12_3.png', 'corridor_dark': A / 'Texture/BGImg/BG_12_6.png', 'offline': A / 'Texture/BGImg/BG_13_18.png',
    'blacksun': A / 'Texture/BGImg/BG_13_32.png', 'red_boss': A / 'Texture/BGImg/BG_13_33.png', 'red_boss2': A / 'Texture/BGImg/BG_13_34.png',
    'beach': A / 'Texture/BGImg/BG_EV_24_04.png', 'squad': A / 'Texture/BGImg/BG_EV_13_07.png',
    'vr': SUB / 'Texture/UI_CharacterDetails_VRroom.png', 'vr2': SUB / 'Texture/UI_CharacterDetails_VRroom2.png', 'sub': SUB / 'Texture/UI_Lobby_Main_BG_Frame_Submarine.png',
}
BGM = {'title': '01 BGM_Title', 'lobby': '02 BGM_Lobby', 'battle1': '03 BGM_Battle_01', 'battle2': '05 BGM_Battle_02', 'battle3': '12 BGM_Battle_03',
       'boss1': '04 BGM_Battle_Boss_01', 'boss2': '31 BGM_Battle_Boss_03', 'talk': '07 BGM_Talk_01'}
S = A / 'Sounds/SFX'
SFX = {
    'battle_start.wav': 'UI/battle_start.wav', 'win.wav': 'UI/battle_win_sfx.wav', 'pick.wav': 'UI/pick_basic.wav', 'pick_ss.wav': 'UI/pick_SS.wav',
    'place.wav': 'UI/equip_basic.wav', 'buff.wav': 'UI/Reinforce_unit.wav', 'res.wav': 'UI/collect_coin_03.wav', 'trans.wav': 'UI/Trainsition_in.wav',
    'warning.wav': 'UI/Warning_infinite.wav', 'round.wav': 'UI/battle_start_part02_round.wav', 'rankup.mp3': 'UI/Rank_UP.mp3',
    'shot.wav': 'Common/Atk/Shot/atk_gun_1.wav', 'rifle.wav': 'Common/Atk/Shot/atk_Rifle-1.wav', 'cannon.wav': 'Common/Atk/Shot/atk_cannon_small.wav',
    'energy.wav': 'Common/Atk/Energy/atk_energy.wav', 'beam.wav': 'Common/Atk/Energy/atk_Beam1.wav', 'explosion.wav': 'Common/effectExplosion.wav',
    'boom_big.wav': 'Common/Explosion/explosion_big.wav', 'boom_scifi.wav': 'Common/Explosion/SciFiExplosion16_IN.wav', 'smoke.wav': 'Common/Explosion/Smoke_bomb_sound.wav',
    'heal.wav': 'Common/shine.wav', 'shield.wav': 'Common/sci-fi_shield_power_on_impact_02.wav', 'card.wav': 'Common/foley_cloth_light_fast_movement_05.wav',
    'swing.wav': 'Common/Atk/Swing/atk_swing_mid.wav', 'swing_heavy.wav': 'Common/Atk/Swing/atk_swing_robot_big.wav', 'zap.wav': 'Common/elec_lightning_magic_spell_11.wav',
}
SKILL_ICONS = ['Command', 'Music', 'Wave', 'AirStrike', 'AssaultAttack', 'EnemyDetect', 'Shock', 'SetTurret', 'WideLightning', 'MultiMissile', 'TeamAtkBuff', 'ExpUp', 'SelfDefBuff', 'Particle', 'Charm', 'Chargeshot', 'WideFireShot', 'Snipe', 'Haze', 'SwordAttk', 'SlowShot', 'Scan', 'ShieldWall', 'SuiceideBomb', 'Vortex', 'Swamp']

for d in ['bg', 'bgm', 'sfx', 'skill']:
    (OUT / d).mkdir(parents=True, exist_ok=True)
for k, p in BG.items():
    im = Image.open(p).convert('RGB')
    if im.width / im.height > 2.0:
        w = int(im.height * 16 / 9); x = (im.width - w) // 2; im = im.crop((x, 0, x + w, im.height))
    im.thumbnail((1920, 1080)); im.save(OUT / 'bg' / f'{k}.jpg', quality=80)
for k, n in BGM.items():
    shutil.copy(A / 'Sounds/BGM' / f'{n}.mp3', OUT / 'bgm' / f'{k}.mp3')
for d, s in SFX.items():
    shutil.copy(S / s, OUT / 'sfx' / d)
for n in SKILL_ICONS:
    shutil.copy(A / 'Texture/SkillTexture' / f'SkillIconCircle_{n}_active.png', OUT / 'skill' / f'{n}.png')
print('assets built')
