from fontTools.ttLib import TTFont

INPUT = "public/fonts/TimesNewRomanHollowBold.woff2"
OUTPUT = "public/fonts/TimesNewRomanHollowBold-fixed.woff2"

font = TTFont(INPUT)

fixed_count = 0
for table in font["cmap"].tables:
    if getattr(table, "language", None) != 0:
        table.language = 0
        fixed_count += 1

font.save(OUTPUT)
print(f"Fixed {fixed_count} cmap subtable(s). Saved to {OUTPUT}")