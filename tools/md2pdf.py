"""Minimal Markdown -> PDF converter (reportlab) for the competitive-analysis doc.
Handles: headings, paragraphs, bullet/number lists, GFM tables, blockquotes,
horizontal rules, inline **bold** *italic* `code` and [links](url).
"""
import re
import sys
import html

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, ListFlowable, ListItem,
)

SRC, OUT = sys.argv[1], sys.argv[2]

styles = getSampleStyleSheet()
BODY = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, leading=14, spaceAfter=6)
H1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=19, leading=23, spaceBefore=6, spaceAfter=10, textColor=colors.HexColor("#1a365d"))
H2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=14, leading=18, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#2c5282"))
H3 = ParagraphStyle("h3", parent=styles["Heading3"], fontSize=11.5, leading=15, spaceBefore=10, spaceAfter=4, textColor=colors.HexColor("#2d3748"))
QUOTE = ParagraphStyle("quote", parent=BODY, leftIndent=10, textColor=colors.HexColor("#4a5568"), fontName="Helvetica-Oblique", borderPadding=(0, 0, 0, 0))
CELL = ParagraphStyle("cell", parent=BODY, fontSize=8.5, leading=11, spaceAfter=0)
CELLH = ParagraphStyle("cellh", parent=CELL, fontName="Helvetica-Bold", textColor=colors.white)


def inline(t: str) -> str:
    t = html.escape(t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<link href="\2" color="#2b6cb0">\1</link>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.5">\1</font>', t)
    t = t.replace("→", "&#8594;").replace("❌", "[x]").replace("✅", "[check]")
    return t


def split_row(line: str):
    return [c.strip() for c in line.strip().strip("|").split("|")]


lines = open(SRC, encoding="utf-8").read().splitlines()
story = []
i = 0
while i < len(lines):
    line = lines[i]
    s = line.strip()

    if not s:
        i += 1
        continue

    if s.startswith("### "):
        story.append(Paragraph(inline(s[4:]), H3)); i += 1; continue
    if s.startswith("## "):
        story.append(Paragraph(inline(s[3:]), H2)); i += 1; continue
    if s.startswith("# "):
        story.append(Paragraph(inline(s[2:]), H1)); i += 1; continue

    if s.startswith("---") and set(s) == {"-"}:
        story.append(Spacer(1, 4)); story.append(HRFlowable(width="100%", color=colors.HexColor("#cbd5e0")))
        story.append(Spacer(1, 4)); i += 1; continue

    # table
    if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i + 1]):
        header = split_row(s)
        i += 2
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            rows.append(split_row(lines[i])); i += 1
        ncol = len(header)
        data = [[Paragraph(inline(c), CELLH) for c in header]]
        for r in rows:
            r = (r + [""] * ncol)[:ncol]
            data.append([Paragraph(inline(c), CELL) for c in r])
        avail = A4[0] - 30 * mm
        tbl = Table(data, colWidths=[avail / ncol] * ncol, repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c5282")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(tbl); story.append(Spacer(1, 8)); continue

    # blockquote (possibly multi-line)
    if s.startswith(">"):
        buf = []
        while i < len(lines) and lines[i].strip().startswith(">"):
            buf.append(lines[i].strip()[1:].strip()); i += 1
        text = " ".join(x for x in buf if x)
        for para in " \n".join(buf).split("\n\n") if False else [text]:
            story.append(Paragraph(inline(para), QUOTE))
        story.append(Spacer(1, 6)); continue

    # lists
    if re.match(r"^([-*]|\d+\.)\s+", s):
        items = []
        bullet = "bullet" if s[0] in "-*" else "1"
        while i < len(lines) and re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]):
            txt = re.sub(r"^\s*([-*]|\d+\.)\s+", "", lines[i])
            items.append(ListItem(Paragraph(inline(txt), BODY), leftIndent=14))
            i += 1
        story.append(ListFlowable(items, bulletType=bullet, start="1" if bullet == "1" else None,
                                  bulletFontSize=8, leftIndent=12))
        story.append(Spacer(1, 4)); continue

    # paragraph
    story.append(Paragraph(inline(s), BODY))
    i += 1

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                        topMargin=15 * mm, bottomMargin=15 * mm,
                        title="Alzheimer's Companion — Competitive Analysis")
doc.build(story)
print("wrote", OUT)
