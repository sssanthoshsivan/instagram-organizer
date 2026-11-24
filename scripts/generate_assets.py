import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("store-assets", exist_ok=True)

# Helper font loader with fallback
def get_font(size, bold=False):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for path in font_names:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

# ==========================================
# 1. SCREENSHOT 1: 1280x800 (RGB, No Alpha)
# "Bulk Select & Unsave on Instagram"
# ==========================================
def make_screenshot_1():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), (15, 17, 23)) # dark sleek background
    draw = ImageDraw.Draw(img)

    font_title = get_font(28, bold=True)
    font_sub = get_font(15, bold=False)
    font_bold = get_font(15, bold=True)
    font_small = get_font(13, bold=False)
    font_brand = get_font(20, bold=True)
    font_tag = get_font(12, bold=True)

    # Top Instagram Header bar
    draw.rectangle([0, 0, W, 64], fill=(22, 24, 32))
    draw.line([0, 64, W, 64], fill=(36, 40, 52), width=1)

    # Savedly Logo Badge in header
    draw_rounded_rect(draw, (40, 14, 80, 50), 8, fill=(138, 58, 185))
    draw.text((50, 19), "S", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((92, 21), "Savedly", font=font_brand, fill=(255, 255, 255))

    # Breadcrumb / Navigation in header
    draw.text((200, 24), "Instagram  /  Profile  /  Saved Posts", font=font_sub, fill=(160, 165, 180))

    # Active Extension Pill
    draw_rounded_rect(draw, (W - 240, 16, W - 40, 48), 16, fill=(29, 34, 48), outline=(60, 68, 92), width=1)
    draw.ellipse([W - 225, 27, W - 215, 37], fill=(52, 211, 153))
    draw.text((W - 205, 23), "Bulk Selection Active", font=font_small, fill=(220, 225, 240))

    # Main Page Title Area
    draw.text((100, 95), "All Posts (Saved)", font=font_title, fill=(255, 255, 255))
    draw.text((100, 138), "Select multiple posts to unsave or organize into collections in one click.", font=font_sub, fill=(150, 155, 170))

    # Grid of posts: 3 columns x 2 rows
    grid_cols = 3
    grid_rows = 2
    cell_w = 330
    cell_h = 230
    start_x = 100
    start_y = 180
    gap_x = 35
    gap_y = 30

    post_colors = [
        ((45, 52, 70), "Design Inspirations", True),
        ((35, 45, 65), "Photography Ideas", False),
        ((50, 40, 65), "Tech & Gadgets", True),
        ((40, 55, 55), "Architecture & Living", False),
        ((60, 48, 42), "Recipes & Cooking", False),
        ((38, 48, 62), "Travel Bucket List", False),
    ]

    for idx, (bg_col, title, selected) in enumerate(post_colors):
        r = idx // grid_cols
        c = idx % grid_cols
        x = start_x + c * (cell_w + gap_x)
        y = start_y + r * (cell_h + gap_y)

        # Card container
        border_col = (147, 51, 234) if selected else (45, 50, 65)
        border_w = 2 if selected else 1
        draw_rounded_rect(draw, (x, y, x + cell_w, y + cell_h), 12, fill=bg_col, outline=border_col, width=border_w)

        # Placeholder thumbnail graphic
        draw_rounded_rect(draw, (x + 15, y + 15, x + cell_w - 15, y + cell_h - 55), 8, fill=(bg_col[0] - 10, bg_col[1] - 10, bg_col[2] - 10))
        draw.text((x + 25, y + cell_h - 42), title, font=font_bold, fill=(230, 235, 245))

        # Selection Circle in Top-Right
        circle_cx = x + cell_w - 32
        circle_cy = y + 32
        radius = 14
        if selected:
            # Active checked circle
            draw.ellipse([circle_cx - radius, circle_cy - radius, circle_cx + radius, circle_cy + radius], fill=(147, 51, 234))
            # Checkmark
            draw.line([circle_cx - 6, circle_cy, circle_cx - 2, circle_cy + 5], fill=(255, 255, 255), width=2)
            draw.line([circle_cx - 2, circle_cy + 5, circle_cx + 7, circle_cy - 5], fill=(255, 255, 255), width=2)
        else:
            # Subtle hollow circle
            draw.ellipse([circle_cx - radius, circle_cy - radius, circle_cx + radius, circle_cy + radius], fill=(0, 0, 0, 120), outline=(220, 225, 240), width=2)

    # Floating Bottom Action Dock (Centered)
    dock_w = 600
    dock_h = 68
    dock_x = (W - dock_w) // 2
    dock_y = H - 95

    # Dock shadow & body
    draw_rounded_rect(draw, (dock_x - 2, dock_y - 2, dock_x + dock_w + 2, dock_y + dock_h + 2), 24, fill=(10, 12, 16))
    draw_rounded_rect(draw, (dock_x, dock_y, dock_x + dock_w, dock_y + dock_h), 22, fill=(24, 27, 36), outline=(65, 75, 100), width=1)

    # Dock text: Selection count
    draw.text((dock_x + 30, dock_y + 22), "2 posts selected", font=font_bold, fill=(255, 255, 255))

    # Action Buttons: Clear
    draw_rounded_rect(draw, (dock_x + 230, dock_y + 14, dock_x + 320, dock_y + 54), 16, fill=(38, 43, 58), outline=(60, 68, 90), width=1)
    draw.text((dock_x + 252, dock_y + 23), "Clear", font=font_bold, fill=(200, 205, 220))

    # Action Buttons: Unsave (2) - Primary CTA
    draw_rounded_rect(draw, (dock_x + 335, dock_y + 14, dock_x + 480, dock_y + 54), 16, fill=(225, 48, 108))
    draw.text((dock_x + 355, dock_y + 23), "Unsave (2)", font=font_bold, fill=(255, 255, 255))

    # Close button (X)
    draw_rounded_rect(draw, (dock_x + dock_w - 55, dock_y + 16, dock_x + dock_w - 20, dock_y + 52), 18, fill=(35, 40, 52))
    draw.text((dock_x + dock_w - 43, dock_y + 22), "✕", font=get_font(16, bold=True), fill=(180, 185, 200))

    img.save("store-assets/screenshot-1.png", format="PNG")
    print("Saved store-assets/screenshot-1.png (1280x800 RGB)")

# ==========================================
# 2. SCREENSHOT 2: 1280x800 (RGB, No Alpha)
# "Savedly Extension Popup & Quick Controls"
# ==========================================
def make_screenshot_2():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), (15, 17, 23))
    draw = ImageDraw.Draw(img)

    font_title = get_font(26, bold=True)
    font_bold = get_font(15, bold=True)
    font_sub = get_font(14, bold=False)
    font_small = get_font(12, bold=False)

    # Blurred Instagram background elements
    draw.rectangle([0, 0, W, 64], fill=(20, 22, 28))
    draw.line([0, 64, W, 64], fill=(32, 36, 46), width=1)
    draw.text((80, 22), "Instagram  /  Saved Posts", font=font_sub, fill=(100, 105, 120))

    # Faded background cards
    for c in range(3):
        for r in range(2):
            x = 80 + c * 380
            y = 120 + r * 300
            draw_rounded_rect(draw, (x, y, x + 340, y + 260), 10, fill=(24, 27, 36), outline=(35, 40, 52), width=1)

    # Extension Popup Overlay in Top Right
    pop_w = 380
    pop_h = 490
    pop_x = W - pop_w - 120
    pop_y = 80

    # Popup Outer Drop Shadow & Container
    draw_rounded_rect(draw, (pop_x - 3, pop_y - 3, pop_x + pop_w + 3, pop_y + pop_h + 3), 16, fill=(8, 10, 14))
    draw_rounded_rect(draw, (pop_x, pop_y, pop_x + pop_w, pop_y + pop_h), 14, fill=(24, 27, 38), outline=(65, 75, 105), width=1)

    # Popup Header with Brand Logo
    draw_rounded_rect(draw, (pop_x + 24, pop_y + 24, pop_x + 64, pop_y + 64), 10, fill=(138, 58, 185))
    draw.text((pop_x + 36, pop_y + 29), "S", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((pop_x + 76, pop_y + 26), "Savedly", font=get_font(18, bold=True), fill=(255, 255, 255))
    draw.text((pop_x + 76, pop_y + 48), "Saved Posts Organizer", font=font_small, fill=(160, 165, 185))

    draw.line([pop_x + 24, pop_y + 82, pop_x + pop_w - 24, pop_y + 82], fill=(42, 48, 66), width=1)

    # Feature 1: Bulk Selection Mode Toggle Card
    draw_rounded_rect(draw, (pop_x + 24, pop_y + 98, pop_x + pop_w - 24, pop_y + 190), 10, fill=(32, 37, 52), outline=(50, 58, 80), width=1)
    draw.text((pop_x + 40, pop_y + 114), "Bulk Selection Circles", font=font_bold, fill=(255, 255, 255))
    draw.text((pop_x + 40, pop_y + 140), "Display selection circles on post tiles\nto easily select multiple items.", font=font_small, fill=(170, 175, 195))

    # Toggle Switch ON
    draw_rounded_rect(draw, (pop_x + pop_w - 80, pop_y + 118, pop_x + pop_w - 40, pop_y + 142), 12, fill=(147, 51, 234))
    draw.ellipse([pop_x + pop_w - 58, pop_y + 120, pop_x + pop_w - 42, pop_y + 140], fill=(255, 255, 255))

    # Feature 2: Quick Stats / Status Card
    draw_rounded_rect(draw, (pop_x + 24, pop_y + 206, pop_x + pop_w - 24, pop_y + 325), 10, fill=(32, 37, 52), outline=(50, 58, 80), width=1)
    draw.text((pop_x + 40, pop_y + 222), "How It Works", font=font_bold, fill=(255, 255, 255))
    steps = [
        "1. Open Instagram Saved Posts",
        "2. Click the circle on any post to select",
        "3. Use bottom bar to Unsave or Move"
    ]
    for idx, s in enumerate(steps):
        draw.text((pop_x + 40, pop_y + 252 + idx * 22), s, font=font_small, fill=(190, 195, 215))

    # Feature 3: Privacy & Security Badge
    draw_rounded_rect(draw, (pop_x + 24, pop_y + 340, pop_x + pop_w - 24, pop_y + 405), 10, fill=(20, 45, 35), outline=(35, 95, 65), width=1)
    draw.text((pop_x + 40, pop_y + 355), "100% Private & Local", font=font_bold, fill=(74, 222, 128))
    draw.text((pop_x + 40, pop_y + 377), "No passwords or tokens collected.", font=font_small, fill=(160, 210, 180))

    # Footer
    draw.text((pop_x + 95, pop_y + 440), "Savedly v1.0.0 • Clean & Fast", font=font_small, fill=(120, 125, 145))

    img.save("store-assets/screenshot-2.png", format="PNG")
    print("Saved store-assets/screenshot-2.png (1280x800 RGB)")

# ==========================================
# 3. SMALL PROMO TILE: 440x280 (RGB, No Alpha)
# ==========================================
def make_small_promo_tile():
    W, H = 440, 280
    img = Image.new("RGB", (W, H), (14, 16, 24))
    draw = ImageDraw.Draw(img)

    # Gradient-style subtle background accents
    for i in range(H):
        ratio = i / H
        r = int(14 + ratio * 15)
        g = int(16 + ratio * 8)
        b = int(24 + ratio * 28)
        draw.line([0, i, W, i], fill=(r, g, b))

    # Savedly Logo Icon
    draw_rounded_rect(draw, (40, 36, 96, 92), 14, fill=(138, 58, 185))
    draw.text((55, 43), "S", font=get_font(34, bold=True), fill=(255, 255, 255))

    # Title & Subtitle
    draw.text((112, 40), "Savedly", font=get_font(26, bold=True), fill=(255, 255, 255))
    draw.text((114, 72), "Instagram Saved Posts Manager", font=get_font(12, bold=False), fill=(180, 185, 205))

    # Highlight pitch
    draw.text((40, 118), "Bulk select & unsave your saved", font=get_font(18, bold=True), fill=(240, 245, 255))
    draw.text((40, 144), "posts in just a few clicks.", font=get_font(18, bold=True), fill=(192, 132, 252))

    # Feature badges
    draw_rounded_rect(draw, (40, 190, 155, 222), 16, fill=(35, 40, 60), outline=(60, 70, 100), width=1)
    draw.text((54, 198), "✓ Batch Unsave", font=get_font(11, bold=True), fill=(220, 225, 245))

    draw_rounded_rect(draw, (165, 190, 275, 222), 16, fill=(35, 40, 60), outline=(60, 70, 100), width=1)
    draw.text((179, 198), "✓ 100% Private", font=get_font(11, bold=True), fill=(220, 225, 245))

    draw_rounded_rect(draw, (285, 190, 395, 222), 16, fill=(35, 40, 60), outline=(60, 70, 100), width=1)
    draw.text((304, 198), "✓ Fast & Easy", font=get_font(11, bold=True), fill=(220, 225, 245))

    img.save("store-assets/small-promo-tile.png", format="PNG")
    print("Saved store-assets/small-promo-tile.png (440x280 RGB)")

# ==========================================
# 4. MARQUEE PROMO TILE: 1400x560 (RGB, No Alpha)
# ==========================================
def make_marquee_promo_tile():
    W, H = 1400, 560
    img = Image.new("RGB", (W, H), (13, 15, 22))
    draw = ImageDraw.Draw(img)

    # Background gradient
    for i in range(H):
        ratio = i / H
        r = int(13 + ratio * 16)
        g = int(15 + ratio * 10)
        b = int(22 + ratio * 32)
        draw.line([0, i, W, i], fill=(r, g, b))

    # Left Section: Typography & Branding
    draw_rounded_rect(draw, (80, 70, 160, 150), 20, fill=(138, 58, 185))
    draw.text((102, 80), "S", font=get_font(52, bold=True), fill=(255, 255, 255))

    draw.text((180, 80), "Savedly", font=get_font(42, bold=True), fill=(255, 255, 255))
    draw.text((182, 130), "Saved Posts Manager for Instagram", font=get_font(18, bold=False), fill=(180, 185, 210))

    draw.text((80, 200), "Organize and clean up your", font=get_font(34, bold=True), fill=(255, 255, 255))
    draw.text((80, 246), "saved Instagram library in seconds.", font=get_font(34, bold=True), fill=(192, 132, 252))

    draw.text((80, 310), "Native post selection circles, seamless batch unsaving,", font=get_font(18, bold=False), fill=(180, 185, 205))
    draw.text((80, 340), "and a floating action dock designed for maximum productivity.", font=get_font(18, bold=False), fill=(180, 185, 205))

    # Highlights pills
    pills = ["Zero Data Tracking", "No Password Required", "Bulk Selection Circles", "Lightning Fast"]
    px = 80
    for p in pills:
        draw_rounded_rect(draw, (px, 400, px + 150, 436), 18, fill=(30, 35, 52), outline=(55, 65, 95), width=1)
        draw.text((px + 16, 410), p, font=get_font(12, bold=True), fill=(225, 230, 245))
        px += 162

    # Right Section: App Preview Mockup Window
    mock_x = 780
    mock_y = 65
    mock_w = 540
    mock_h = 430

    # Window container
    draw_rounded_rect(draw, (mock_x - 3, mock_y - 3, mock_x + mock_w + 3, mock_y + mock_h + 3), 16, fill=(8, 10, 14))
    draw_rounded_rect(draw, (mock_x, mock_y, mock_x + mock_w, mock_y + mock_h), 14, fill=(22, 25, 35), outline=(60, 70, 95), width=1)

    # Window Header
    draw_rounded_rect(draw, (mock_x + 16, mock_y + 14, mock_x + 28, mock_y + 26), 6, fill=(239, 68, 68))
    draw_rounded_rect(draw, (mock_x + 34, mock_y + 14, mock_x + 46, mock_y + 26), 6, fill=(245, 158, 11))
    draw_rounded_rect(draw, (mock_x + 52, mock_y + 14, mock_x + 64, mock_y + 26), 6, fill=(34, 197, 94))
    draw.text((mock_x + 85, mock_y + 12), "instagram.com/saved/all-posts/", font=get_font(11, bold=False), fill=(140, 145, 165))

    # Grid of mini tiles
    tile_w = 155
    tile_h = 120
    for r in range(2):
        for c in range(3):
            tx = mock_x + 20 + c * (tile_w + 14)
            ty = mock_y + 48 + r * (tile_h + 14)
            sel = (r == 0 and c == 1) or (r == 1 and c == 0)
            bcol = (147, 51, 234) if sel else (40, 45, 60)
            draw_rounded_rect(draw, (tx, ty, tx + tile_w, ty + tile_h), 8, fill=(32, 36, 50), outline=bcol, width=2 if sel else 1)

            # Mini Circle
            mcx = tx + tile_w - 18
            mcy = ty + 18
            if sel:
                draw.ellipse([mcx - 9, mcy - 9, mcx + 9, mcy + 9], fill=(147, 51, 234))
                draw.text((mcx - 4, mcy - 6), "✓", font=get_font(10, bold=True), fill=(255, 255, 255))
            else:
                draw.ellipse([mcx - 8, mcy - 8, mcx + 8, mcy + 8], fill=(15, 18, 25), outline=(180, 185, 200), width=1)

    # Mini Floating Bar
    bar_w = 400
    bar_h = 50
    bar_x = mock_x + (mock_w - bar_w) // 2
    bar_y = mock_y + mock_h - 75
    draw_rounded_rect(draw, (bar_x, bar_y, bar_x + bar_w, bar_y + bar_h), 14, fill=(18, 21, 30), outline=(65, 75, 100), width=1)
    draw.text((bar_x + 20, bar_y + 16), "2 selected", font=get_font(13, bold=True), fill=(255, 255, 255))
    draw_rounded_rect(draw, (bar_x + bar_w - 130, bar_y + 10, bar_x + bar_w - 20, bar_y + 40), 10, fill=(225, 48, 108))
    draw.text((bar_x + bar_w - 110, bar_y + 16), "Unsave (2)", font=get_font(12, bold=True), fill=(255, 255, 255))

    img.save("store-assets/marquee-promo-tile.png", format="PNG")
    print("Saved store-assets/marquee-promo-tile.png (1400x560 RGB)")

if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_small_promo_tile()
    make_marquee_promo_tile()
    print("All store assets successfully generated!")
