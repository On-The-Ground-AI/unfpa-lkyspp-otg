#!/usr/bin/env python3
"""Generate PDF of the Dr. Asa IT Pitch document from the source Markdown."""
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable, ListFlowable, ListItem,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

SRC = os.path.join(os.path.dirname(__file__), '..', 'docs', 'deliverables',
                   'UNFPA-IT-Pitch-DrAsa.md')
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'deliverables',
                   'UNFPA-IT-Pitch-DrAsa.pdf')

DARK_BLUE = HexColor('#003366')
LIGHT_BLUE = HexColor('#009EDB')
DARK_GRAY = HexColor('#333333')
MED_GRAY = HexColor('#666666')
LIGHT_GRAY = HexColor('#F5F5F5')
BORDER_GRAY = HexColor('#CCCCCC')


def make_styles():
    styles = getSampleStyleSheet()
    base_font = 'Helvetica'
    base_bold = 'Helvetica-Bold'
    base_italic = 'Helvetica-Oblique'

    custom = {
        'DocTitle': ParagraphStyle(
            name='DocTitle', fontName=base_bold, fontSize=22, leading=26,
            textColor=DARK_BLUE, spaceAfter=6, alignment=TA_LEFT),
        'DocSubtitle': ParagraphStyle(
            name='DocSubtitle', fontName=base_italic, fontSize=11,
            leading=14, textColor=MED_GRAY, spaceAfter=14),
        'H1': ParagraphStyle(
            name='H1', fontName=base_bold, fontSize=16, leading=20,
            textColor=DARK_BLUE, spaceBefore=18, spaceAfter=8),
        'H2': ParagraphStyle(
            name='H2', fontName=base_bold, fontSize=13, leading=16,
            textColor=DARK_BLUE, spaceBefore=12, spaceAfter=6),
        'H3': ParagraphStyle(
            name='H3', fontName=base_bold, fontSize=11, leading=14,
            textColor=LIGHT_BLUE, spaceBefore=10, spaceAfter=4),
        'Body': ParagraphStyle(
            name='Body', fontName=base_font, fontSize=10, leading=14,
            textColor=DARK_GRAY, spaceAfter=6, alignment=TA_JUSTIFY),
        'BulletItem': ParagraphStyle(
            name='BulletItem', fontName=base_font, fontSize=10, leading=14,
            textColor=DARK_GRAY, leftIndent=14, bulletIndent=2, spaceAfter=3),
        'NumItem': ParagraphStyle(
            name='NumItem', fontName=base_font, fontSize=10, leading=14,
            textColor=DARK_GRAY, leftIndent=20, bulletIndent=2, spaceAfter=4),
        'Meta': ParagraphStyle(
            name='Meta', fontName=base_font, fontSize=10, leading=13,
            textColor=MED_GRAY, spaceAfter=2),
        'Sig': ParagraphStyle(
            name='Sig', fontName=base_bold, fontSize=11, leading=14,
            textColor=DARK_BLUE, spaceBefore=14),
    }
    for name, style in custom.items():
        if name in styles:
            styles[name].__dict__.update(style.__dict__)
        else:
            styles.add(style)
    return styles


def inline_md(text):
    """Convert minimal inline markdown to ReportLab mini-HTML."""
    # Bold **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic *text*  (must run after bold so ** is already gone)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
    # Inline code `text`
    text = re.sub(r'`([^`]+)`', r'<font face="Courier">\1</font>', text)
    # Escape stray ampersands that aren't entities
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', text)
    return text


def parse_markdown(path):
    """Parse the markdown into a flat list of blocks.

    Each block is a tuple: (kind, payload) where kind is one of:
    h1, h2, h3, para, bullet, num, hr, table, blank
    """
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()

    lines = raw.split('\n')
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Horizontal rule
        if re.match(r'^-{3,}$', stripped):
            blocks.append(('hr', None))
            i += 1
            continue

        # Headings
        m = re.match(r'^(#{1,4})\s+(.+?)\s*$', stripped)
        if m:
            level = len(m.group(1))
            text = m.group(2)
            kind = {1: 'h1', 2: 'h1', 3: 'h2', 4: 'h3'}.get(level, 'h3')
            blocks.append((kind, text))
            i += 1
            continue

        # Table (start with a line that looks like | ... |)
        if stripped.startswith('|') and stripped.endswith('|'):
            tbl = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                tbl.append(row)
                i += 1
            # Drop the separator row (|---|---|)
            tbl = [r for r in tbl if not all(re.match(r'^:?-+:?$', c) for c in r)]
            if tbl:
                blocks.append(('table', tbl))
            continue

        # Unordered bullet
        m = re.match(r'^[-*]\s+(.+)$', stripped)
        if m:
            blocks.append(('bullet', m.group(1)))
            i += 1
            continue

        # Numbered item
        m = re.match(r'^(\d+)\.\s+(.+)$', stripped)
        if m:
            blocks.append(('num', (m.group(1), m.group(2))))
            i += 1
            continue

        # Blank line
        if not stripped:
            blocks.append(('blank', None))
            i += 1
            continue

        # Paragraph — join continuation lines
        para = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if (not nxt
                    or nxt.startswith('#')
                    or nxt.startswith('|')
                    or re.match(r'^[-*]\s', nxt)
                    or re.match(r'^\d+\.\s', nxt)
                    or re.match(r'^-{3,}$', nxt)):
                break
            para.append(nxt)
            i += 1
        blocks.append(('para', ' '.join(para)))

    return blocks


def build_pdf(blocks, out_path):
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title='UNFPA Partnership Catalyst — IT Team Pitch',
        author='Dr. Asa Torkelsson, UNFPA Seoul',
    )
    styles = make_styles()
    story = []

    # Cover block
    story.append(Paragraph(
        'Introducing the UNFPA Partnership Catalyst',
        styles['DocTitle']))
    story.append(Paragraph(
        'An AI-Powered Knowledge Tool', styles['DocTitle']))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=1.5, color=LIGHT_BLUE,
                            spaceBefore=0, spaceAfter=8))
    story.append(Paragraph(
        '<b>Prepared by:</b> Dr. Asa Torkelsson, Chief, UNFPA Seoul Representation Office',
        styles['Meta']))
    story.append(Paragraph('<b>Audience:</b> UNFPA IT Team', styles['Meta']))
    story.append(Paragraph('<b>Date:</b> April 2026', styles['Meta']))
    story.append(Paragraph(
        '<b>Purpose:</b> Introduction, technical briefing, and deployment approval pathway',
        styles['Meta']))
    story.append(Spacer(1, 10))

    # Skip the markdown's own header block — we've replaced it with the cover
    # above. Find the first H1 after the cover metadata.
    start_idx = 0
    seen_first_h1 = False
    for idx, (kind, payload) in enumerate(blocks):
        if kind == 'h1' and not seen_first_h1:
            seen_first_h1 = True
            continue
        if kind == 'h1' and seen_first_h1:
            start_idx = idx
            break

    for kind, payload in blocks[start_idx:]:
        if kind == 'h1':
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width='100%', thickness=0.6,
                                    color=BORDER_GRAY, spaceBefore=4,
                                    spaceAfter=2))
            story.append(Paragraph(inline_md(payload), styles['H1']))
        elif kind == 'h2':
            story.append(Paragraph(inline_md(payload), styles['H2']))
        elif kind == 'h3':
            story.append(Paragraph(inline_md(payload), styles['H3']))
        elif kind == 'para':
            story.append(Paragraph(inline_md(payload), styles['Body']))
        elif kind == 'bullet':
            story.append(Paragraph('• ' + inline_md(payload), styles['BulletItem']))
        elif kind == 'num':
            num, text = payload
            story.append(Paragraph(f'{num}. ' + inline_md(text),
                                   styles['NumItem']))
        elif kind == 'hr':
            story.append(HRFlowable(width='100%', thickness=0.5,
                                    color=BORDER_GRAY, spaceBefore=4,
                                    spaceAfter=4))
        elif kind == 'table':
            rows = payload
            data = [[Paragraph(inline_md(cell), styles['Body']) for cell in r]
                    for r in rows]
            col_count = max(len(r) for r in rows)
            avail = A4[0] - 36 * mm
            col_widths = [avail / col_count] * col_count
            t = Table(data, colWidths=col_widths, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.4, BORDER_GRAY),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            # Header row text needs to be white — rebuild header paragraphs
            header_style = ParagraphStyle(
                'TblHeader', parent=styles['Body'],
                fontName='Helvetica-Bold', textColor=white)
            data[0] = [Paragraph(inline_md(c),
                                 header_style) for c in rows[0]]
            t = Table(data, colWidths=col_widths, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.4, BORDER_GRAY),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(Spacer(1, 4))
            story.append(t)
            story.append(Spacer(1, 6))
        elif kind == 'blank':
            story.append(Spacer(1, 3))

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(LIGHT_BLUE)
        canvas.setLineWidth(1.2)
        canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MED_GRAY)
        canvas.drawString(18 * mm, 7 * mm,
                          'UNFPA Partnership Catalyst — IT Team Pitch')
        canvas.drawRightString(A4[0] - 18 * mm, 7 * mm,
                               f'Page {doc_.page}')
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    size = os.path.getsize(out_path)
    print(f'PDF written: {out_path} ({size:,} bytes)')


if __name__ == '__main__':
    blocks = parse_markdown(SRC)
    build_pdf(blocks, OUT)
