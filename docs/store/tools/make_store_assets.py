"""Builds NotifyIQ Play Store graphics from raw emulator screenshots.

Usage: python make_store_assets.py <raw_screenshot_dir> <out_dir>
Produces icon-512.png, feature-graphic-1024x500.png and framed phone screenshots (1200x2400, 2:1).
Screenshots must come from synthetic demo data only (StoreDemoDataSeeder).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

raw_dir, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
HERO, ACCENT, AMBER, INK = (75, 47, 191), (124, 92, 240), (255, 181, 71), (23, 21, 42)
FONT = "/System/Library/Fonts/Avenir Next.ttc"

def font(size, bold=True):
    try: return ImageFont.truetype(FONT, size, index=2 if bold else 0)  # Avenir Next: 2 = Bold, 0 = Regular
    except OSError: return ImageFont.load_default()

def n_mark(draw, ox, oy, scale, color):
    # Same geometry as the adaptive icon foreground (108-unit viewport).
    pts = [(36,74),(36,36),(44.5,36),(63.5,60.5),(63.5,36),(72,36),(72,74),(63.5,74),(44.5,49.5),(44.5,74)]
    draw.polygon([(ox + x*scale, oy + y*scale) for x, y in pts], fill=color)

def icon(size):
    s = size / 108
    img = Image.new("RGB", (size, size), HERO)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([(92-46)*s, (16-46)*s, (92+46)*s, (16+46)*s], fill=ACCENT + (166,))
    g.ellipse([(20-26)*s, (100-26)*s, (20+26)*s, (100+26)*s], fill=ACCENT + (90,))
    img.paste(glow, (0, 0), glow)
    d = ImageDraw.Draw(img)
    n_mark(d, 0, 0, s, (255, 255, 255))
    d.ellipse([(75-10)*s, (34-10)*s, (75+10)*s, (34+10)*s], fill=HERO)
    d.ellipse([(75-7)*s, (34-7)*s, (75+7)*s, (34+7)*s], fill=AMBER)
    return img

icon(512).save(os.path.join(out, "icon-512.png"))

# Feature graphic 1024x500
fg = Image.new("RGB", (1024, 500), HERO)
layer = Image.new("RGBA", fg.size, (0, 0, 0, 0)); L = ImageDraw.Draw(layer)
L.ellipse([700, -220, 1180, 260], fill=ACCENT + (150,)); L.ellipse([-120, 330, 200, 650], fill=ACCENT + (90,))
fg.paste(layer, (0, 0), layer)
ic = icon(180).resize((180, 180)); mask = Image.new("L", (180, 180), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, 180, 180], 44, fill=255)
ring = Image.new("RGBA", fg.size, (0, 0, 0, 0)); R = ImageDraw.Draw(ring)
R.rounded_rectangle([58, 172, 262, 376], 52, fill=(0, 0, 0, 90))
ring = ring.filter(ImageFilter.GaussianBlur(14)); fg.paste(ring, (0, 0), ring)
ImageDraw.Draw(fg).rounded_rectangle([62, 152, 258, 348], 50, fill=(255, 255, 255))
fg.paste(ic, (70, 160), mask)
d = ImageDraw.Draw(fg)
d.text((290, 150), "NotifyIQ", font=font(84), fill=(255, 255, 255))
d.text((292, 258), "Your notifications, understood.", font=font(36), fill=(220, 211, 255))
d.text((292, 318), "Private · on-device · no internet access", font=font(26, bold=False), fill=(203, 191, 255))
fg.save(os.path.join(out, "feature-graphic-1024x500.png"))

captions = {
    "1_home": ("Your day at a glance", "Counts, categories and what needs a look"),
    "2_home_more": ("Never miss what’s coming", "Bills, renewals and appointments, found for you"),
    "3_inbox": ("Every notification, kept", "Search, save and organise, even after dismissing"),
    "4_money": ("See where your money goes", "Spending and income from payment alerts"),
    "5_money_categories": ("Food, fuel, tickets & more", "Automatic categories you can correct"),
    "6_money_charts": ("Patterns, not just numbers", "Daily flow, spending calendar and habits"),
    "7_upcoming": ("Reminders that respect you", "One tap to be reminded before it’s due"),
    "8_privacy": ("Private by design", "No internet access, no account, optional app lock"),
}
W, H = 1200, 2400
for name, (title, sub) in captions.items():
    src = os.path.join(raw_dir, f"raw_{name}.png")
    if not os.path.exists(src): continue
    shot = Image.open(src).convert("RGB")
    canvas = Image.new("RGB", (W, H), HERO)
    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0)); D = ImageDraw.Draw(deco)
    D.ellipse([700, -300, 1500, 500], fill=ACCENT + (140,)); D.ellipse([-300, 1900, 400, 2600], fill=ACCENT + (80,))
    canvas.paste(deco, (0, 0), deco)
    d = ImageDraw.Draw(canvas)
    tw = d.textlength(title, font=font(68)); d.text(((W - tw) / 2, 90), title, font=font(68), fill=(255, 255, 255))
    sw = d.textlength(sub, font=font(38, bold=False)); d.text(((W - sw) / 2, 190), sub, font=font(38, bold=False), fill=(220, 211, 255))
    target_h = H - 330; target_w = round(shot.width * target_h / shot.height)
    phone = shot.resize((target_w, target_h), Image.LANCZOS)
    radius = 56; m = Image.new("L", phone.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, *phone.size], radius, fill=255)
    x = (W - target_w) // 2; y = 300
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(shadow).rounded_rectangle([x + 8, y + 24, x + target_w + 8, y + target_h + 24], radius, fill=(0, 0, 0, 110))
    canvas.paste(shadow.filter(ImageFilter.GaussianBlur(24)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(24)))
    canvas.paste(phone, (x, y), m)
    canvas.save(os.path.join(out, f"screenshot-{name}.png"))

# Contact sheet for review
files = sorted(f for f in os.listdir(out) if f.startswith("screenshot-"))
thumbs = [Image.open(os.path.join(out, f)).resize((300, 600)) for f in files]
sheet = Image.new("RGB", (300 * 4 + 50, 600 * ((len(thumbs) + 3) // 4) + 10 * 2), (240, 240, 245))
for i, t in enumerate(thumbs): sheet.paste(t, (10 + (i % 4) * 310, 10 + (i // 4) * 610))
sheet.save(os.path.join(raw_dir, "contact-sheet.png"))
print("assets:", ", ".join(sorted(os.listdir(out))))
