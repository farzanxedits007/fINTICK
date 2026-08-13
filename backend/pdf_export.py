from io import BytesIO


def _styles():
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    styles = getSampleStyleSheet()
    title = ParagraphStyle('FinTitle', parent=styles['Title'], fontSize=16, leading=20, spaceAfter=2)
    sub = ParagraphStyle('FinSub', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.grey)
    cell = ParagraphStyle('FinCell', parent=styles['Normal'], fontSize=8, leading=10)
    head = ParagraphStyle('FinHead', parent=cell, fontName='Helvetica-Bold', textColor=colors.white)
    return title, sub, cell, head


def ledger_pdf(title, subtitle, header, rows):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm, bottomMargin=14 * mm)
    title_s, sub_s, cell_s, head_s = _styles()

    story = [
        Paragraph(title, title_s),
        Paragraph(subtitle, sub_s),
        Spacer(1, 6 * mm),
    ]

    data = [[Paragraph(h, head_s) for h in header]]
    for row in rows:
        data.append([Paragraph(str(c), cell_s) for c in row])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#d1d5db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(table)

    doc.build(story)
    buf.seek(0)
    return buf


def payment_slip_pdf(company, slip_no, fields, amount):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    title_s, sub_s, cell_s, _ = _styles()

    story = [
        Paragraph(company, title_s),
        Paragraph(f'Payment Slip — {slip_no}', sub_s),
        Spacer(1, 8 * mm),
    ]

    data = [[Paragraph(f'<b>{label}</b>', cell_s), Paragraph(str(value), cell_s)] for label, value in fields]
    data.append([Paragraph('<b>Amount (PKR)</b>', cell_s), Paragraph(f'<b>{amount}</b>', cell_s)])

    table = Table(data, colWidths=[70 * mm, 85 * mm])
    table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#d1d5db')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    doc.build(story)
    buf.seek(0)
    return buf
