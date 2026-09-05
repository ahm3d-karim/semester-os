#!/usr/bin/env python3
"""Parse LUMS Fall 2026 registrar PDFs -> data/lums-fall-2026.json

Inputs (Desktop, user-provided, NOT committed):
  - "Fall Semester 2026 - Class Schedule.pdf"        (course/section meetings)
  - "Fall Semester 2026 - Final Exam Matrix(1).pdf"  (meeting pattern -> final exam slot)

Output: data/lums-fall-2026.json (gitignored)
Run: uv run --with pymupdf python scripts/parse-catalog.py
"""
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import pymupdf

DESKTOP = Path.home() / "Desktop"
SCHEDULE_PDF = DESKTOP / "Fall Semester 2026 - Class Schedule.pdf"
EXAM_PDF = DESKTOP / "Fall Semester 2026 - Final Exam Matrix(1).pdf"
OUT = Path(__file__).resolve().parent.parent / "data" / "lums-fall-2026.json"

COURSE_RE = re.compile(r"^([A-Z]{2,6}) (\d{3,4}[A-Z]?)$")
TIME_RE = re.compile(r"^\d{1,2}:\d{2}(AM|PM)$")
DAYS_RE = re.compile(r"^[MTWRFSU]{1,7}$")
DAY_NUM = {"M": 0, "T": 1, "W": 2, "R": 3, "F": 4, "S": 5, "U": 6}

# Column left edges measured from the PDF header (stable across pages)
COL_EDGES = [
    ("code", 38), ("title", 79), ("credit", 175), ("section", 211),
    ("session", 246), ("days", 287), ("start", 322), ("end", 363),
    ("instructor", 404), ("building", 480), ("room", 520),
]


def to_24h(t: str):
    m = TIME_RE.match(t.strip())
    if not m:
        return None
    h = int(t.split(":")[0])
    mm = int(t.split(":")[1][:2])
    if t.endswith("PM") and h != 12:
        h += 12
    if t.endswith("AM") and h == 12:
        h = 0
    return h, mm


def time_str(t):
    return f"{t[0]:02d}:{t[1]:02d}"


def day_list(token: str):
    return sorted({DAY_NUM[c] for c in token if c in DAY_NUM})


def col_of(x: float) -> str | None:
    """Bucket by header left edges: last column whose edge is <= x+8 wins."""
    name = None
    for cname, ex in COL_EDGES:
        if x >= ex - 8:
            name = cname
    return name


def cluster_lines(items, tol=3.0):
    """items: [(y, x, payload)] -> list of {'y': group_y, 'items': [(x, payload)]}."""
    out = []
    for y, x, payload in sorted(items, key=lambda t: (t[0], t[1])):
        for g in out:
            if abs(g["y"] - y) <= tol:
                g["items"].append((x, payload))
                break
        else:
            out.append({"y": y, "items": [(x, payload)]})
    return out


def parse_schedule():
    doc = pymupdf.open(SCHEDULE_PDF)
    courses = []
    stats = {"invalid": 0, "instructor_shared": 0, "no_room": 0}

    for pg in range(doc.page_count):
        page = doc[pg]
        words = page.get_text("words")

        # --- header band: the y-cluster holding the 11 column labels ---
        HDR = ("Course", "Code", "Title", "Credit", "Hrs.", "Section", "Session",
               "Days", "Start", "Time", "End", "Instructor", "Building", "Room")
        hw = [(x0, y0, x1, y1, w) for x0, y0, x1, y1, w, *_ in words if w in HDR]
        if len(hw) < 10:
            continue
        band = Counter(int(y0 // 14) for _, y0, *_ in hw).most_common(1)[0][0]
        band_words = [t for t in hw if int(t[1] // 14) == band]
        header_bottom = max(y1 for _, _, _, y1, _ in band_words)

        # --- data words below the header ---
        dw = [(x0, y0, w) for x0, y0, x1, y1, w, *_ in words if y0 > header_bottom]

        # --- visual lines (tolerance-clustered) ---
        line_list = cluster_lines([(y0, x0, w) for x0, y0, w in dw])
        anchors = []
        for g in line_list:
            toks = sorted(g["items"])
            # code-column tokens only (the visual line also carries title words)
            code_toks = [(x, w) for x, w in toks if x < 75]
            text = " ".join(w for _, w in code_toks)
            if COURSE_RE.match(text) and col_of(code_toks[0][0]) == "code":
                anchors.append((g["y"], text))
        anchors.sort(key=lambda a: a[0])

        # --- build one record per anchor, spanning to the next anchor's y ---
        # Wrapped titles START ABOVE the code line ('Theory and Concepts of'
        # sits 7pt above 'ACCT 202'). Title words are owned by the record whose
        # anchor follows them: title window = [ay - 11, next_ay - 11); all
        # other columns stay [ay, next_ay).
        anchor_ys = [a[0] for a in anchors]
        for i, (ay, code) in enumerate(anchors):
            y_end = anchor_ys[i + 1] if i + 1 < len(anchors) else 10**9
            body = [(x0, y0, w) for x0, y0, w in dw if ay <= y0 < y_end]
            title = [
                (x0, y0, w)
                for x0, y0, w in dw
                if 75 <= x0 < 175 and ay - 11 <= y0 < y_end - 11
            ]
            rec = build_record(code, body, title, stats)
            if rec:
                courses.append(rec)

    return courses, stats


def build_record(code, span, title_span, stats):
    cells = {n: [] for n, _ in COL_EDGES}
    for x0, y0, w in span:
        c = col_of(x0)
        if c:
            cells[c].append((y0, x0, w))
    # title words come from the dedicated title window (pre-line + post-line)
    tcells = []
    for x0, y0, w in title_span:
        tcells.append((y0, x0, w))
    cells["title"] = tcells

    # --- meeting-row anchors from the days column (one token per row) ---
    day_words = sorted(cells["days"])
    row_ys = []
    for y0, _, _ in day_words:
        if row_ys and abs(row_ys[-1] - y0) <= 4:
            continue
        row_ys.append(y0)
    if not row_ys:
        # cross-listed-only record
        rec = {"code": code, "title": "", "credit_hours": None,
               "sections": [], "cross_listed": []}
        tseg = cells["title"]
        if tseg:
            title_words = sorted((x, w) for y, x, w in tseg)
            rec["title"] = " ".join(w for _, w in title_words)
        cx = [w for _, x, w in sorted([(y, x, w) for y, x, w in cells["section"]])]
        text = " ".join(cx)
        if text.startswith("w/ "):
            rec["cross_listed"] = [m.group(0) for m in re.finditer(r"[A-Z]{2,6} \d{3,4}[A-Z]?", text)]
        return rec if rec["cross_listed"] else None

    def assign_rows(colname):
        """Assign each word to its nearest row anchor; join per row in reading
        order (y, then x) so wrapped two-line cells stay ordered."""
        rows: list[list[tuple[float, float, str]]] = [[] for _ in row_ys]
        for y0, x0, w in sorted(cells[colname]):
            if not rows:
                break
            k = min(range(len(row_ys)), key=lambda i: abs(row_ys[i] - y0))
            rows[k].append((y0, x0, w))
        return [" ".join(w for _, _, w in sorted(r)) for r in rows]

    rec = {"code": code, "title": "", "credit_hours": None,
           "sections": [], "cross_listed": []}

    # title: all words above the first row anchor (or the nearest to it)
    title_rows = assign_rows("title")
    rec["title"] = title_rows[0] if title_rows else ""

    cvals = assign_rows("credit")
    m = re.match(r"^(\d+(?:\.\d+)?)$", cvals[0]) if cvals else None
    if m:
        rec["credit_hours"] = float(m.group(1))

    # section codes: nearest-row assignment; wrapped or repeated codes repeat
    sec_rows = assign_rows("section")
    sec_codes = []
    for text in sec_rows:
        text = text.strip()
        if text.startswith("w/ "):
            rec["cross_listed"].extend(
                mm.group(0) for mm in re.finditer(r"[A-Z]{2,6} \d{3,4}[A-Z]?", text))
        elif text:
            sec_codes.append(text)
    n = len(row_ys)
    # rows with no code token inherit the nearest previous code (repeated sections)
    filled = []
    last = None
    for i in range(n):
        if i < len(sec_rows) and not sec_rows[i].startswith("w/ ") and sec_rows[i].strip():
            last = sec_rows[i].strip()
        filled.append(last or "")
    sec_codes = filled

    # --- per-column values, one per row ---
    def val(i, colname):
        rows = assign_rows(colname)
        return rows[i] if i < len(rows) else ""

    sessions = [val(i, "session") for i in range(n)]
    days_list = [val(i, "days") for i in range(n)]
    starts = [val(i, "start") for i in range(n)]
    ends = [val(i, "end") for i in range(n)]
    blds = [val(i, "building") for i in range(n)]
    rooms = [val(i, "room") for i in range(n)]

    # instructors: per-row if counts match, else course-wide co-taught string
    instr_rows = assign_rows("instructor")
    instr_texts = [t for t in instr_rows if t]
    if len(instr_texts) == n:
        instrs = instr_texts
    elif instr_texts:
        instrs = [", ".join(instr_texts)] * n
        stats["instructor_shared"] += 1
    else:
        instrs = [""] * n

    for i in range(n):
        sc = sec_codes[i]
        if not sc:
            continue
        s24 = to_24h(starts[i])
        e24 = to_24h(ends[i])
        d_raw = days_list[i].replace(" ", "")
        if not s24 or not e24 or not d_raw or not DAYS_RE.match(d_raw):
            stats["invalid"] += 1
            continue
        rec["sections"].append({
            "code": sc,
            "session": sessions[i],
            "days_raw": d_raw,
            "days": day_list(d_raw),
            "start": time_str(s24),
            "end": time_str(e24),
            "instructor": instrs[i],
            "building": blds[i],
            "room": rooms[i],
        })
    return rec if (rec["sections"] or rec["cross_listed"]) else None


def parse_exam_matrix():
    """Positional parse of the 1-page landscape matrix (word coordinates).

    Corrected grid model (verified against word dump):
      - columns = exam dates, headers at y~88 (Sat x=74 ... Tue x=718)
      - left-axis tokens at x~46: exam TIME bands (0800-1100 y=127, 1130-1430
        y=213, 1500-1800 y=293, 1830-2130 y=375); a row's band = last axis
        token above it
      - cells under a date column hold a class meeting pattern
        ('MW 8:00AM-9:15AM'), a pinned course ('AI 501'), or a combined-exam
        course list ('ACCT 100 LEC 1 - 8'); 'No exam' cells are skipped;
        some course cells carry an inline time override ('CS 582 ... 1500-1800')
    """
    doc = pymupdf.open(EXAM_PDF)
    words = doc[0].get_text("words")
    if not words:
        return [], []

    # --- date columns from headers ---
    hdr = [(x0, y0, w) for x0, y0, x1, y1, w, *_ in words
           if re.match(r"^(Mon|Tue|Wed|Thr|Thu|Fri|Sat|Sun),$", w)]
    hdr.sort()
    cols = []
    for x0, y0, w in hdr:
        if cols and x0 - cols[-1]["x0"] < 60:
            continue
        cols.append({"x0": x0, "y0": y0})
    labels = {}
    dec_words = [(wx0, wy0) for wx0, wy0, wx1, wy1, wd, *_ in words if wd == "Dec"]
    for x0, y0, w in hdr:
        k = next((i for i, c in enumerate(cols) if abs(c["x0"] - x0) < 60), None)
        # 'Dec' and the day number are separate words right of the 'Ddd,' header
        dt = None
        for dx0, dy0 in dec_words:
            if abs(dy0 - y0) < 4 and 0 < dx0 - x0 < 60:
                day_num = next((wd for wx0, wy0, wx1, wy1, wd, *_ in words
                                if abs(wy0 - dy0) < 4 and 0 < wx0 - dx0 < 30
                                and re.match(r"^\d{1,2}$", wd)), None)
                if day_num:
                    dt = f"Dec {day_num}"
                    break
        if k is not None and dt:
            labels[k] = f"{w.rstrip(',')} {dt}"
    if not labels:
        return [], []
    col_xs = [c["x0"] for c in cols]

    def col_index(x):
        best, bd = None, 1e9
        for i, cx in enumerate(col_xs):
            d = abs(x - cx)
            if d < bd:
                bd, best = d, i
        return best

    # --- exam TIME bands from the LEFT axis (x < 70) ---
    bands = []
    for x0, y0, x1, y1, w, *_ in words:
        if x0 < 70 and re.match(r"^\d{4}-\d{4}$", w):
            bands.append((y0, w))
    bands.sort()

    def band_for(y):
        cur = bands[0][1] if bands else "0800-1100"
        for by, bw in bands:
            if by <= y + 8:
                cur = bw
            else:
                break
        return cur

    PAT_RE = re.compile(r"([MTWRFSU]{1,7}) (\d{1,2}:\d{2}(?:AM|PM))-(\d{1,2}:\d{2}(?:AM|PM))")
    CRSE_RE = re.compile(r"([A-Z]{2,6} \d{3,4}[A-Z]?)(?: (?:LEC|LAB|SEM) (\d+) ?[-\u2013] ?(\d+))?")
    TMRANGE_RE = re.compile(r"^(\d{4})-(\d{4})$")

    # --- rows ---
    rows = []
    for x0, y0, x1, y1, w, *_ in sorted(words, key=lambda t: (round(t[1], 1), t[0])):
        for r in rows:
            if abs(r["y"] - y0) <= 3:
                r["cells"].append((x0, w))
                break
        else:
            rows.append({"y": y0, "cells": [(x0, w)]})

    exam_patterns = []
    assignments = []

    for r in rows:
        cells = sorted(r["cells"])
        rtime = band_for(r["y"])
        per_col = {}
        for x, w in cells:
            if x < 55:  # left axis (time bands live at x~46)
                continue
            k = col_index(x)
            if k in labels:
                per_col.setdefault(k, []).append(w)

        for k, toks in per_col.items():
            text = " ".join(toks)
            if re.search(r"EXAM|LUMS|Semester|examinations|Combined exams|No exam", text):
                continue
            inline_time = None
            tm = TMRANGE_RE.search(text)
            if tm and not PAT_RE.search(text):
                inline_time = tm.group(0)
                text = text.replace(tm.group(0), " ").strip()
            for pm in PAT_RE.finditer(text):
                exam_patterns.append({
                    "pattern": f"{pm.group(1)} {pm.group(2)}-{pm.group(3)}",
                    "date": labels[k],
                    "time": inline_time or rtime,
                })
            for cm in CRSE_RE.finditer(text):
                entry = {
                    "course": cm.group(1),
                    "section_range": f"{cm.group(2)}-{cm.group(3)}" if cm.group(2) else None,
                    "date": labels[k],
                    "time": inline_time or rtime,
                }
                if entry not in assignments:
                    assignments.append(entry)

    return exam_patterns, assignments


def main():
    if not SCHEDULE_PDF.exists():
        sys.exit(f"missing {SCHEDULE_PDF}")
    courses, stats = parse_schedule()
    exams, combined = parse_exam_matrix()

    with_sections = [c for c in courses if c["sections"]]
    total_secs = sum(len(c["sections"]) for c in courses)

    out = {
        "term": "Fall 2026",
        "institution": "LUMS",
        "session_dates": "2026-08-27 to 2026-12-08",
        "generated_at": str(date.today()),
        "source": "LUMS Office of the Registrar (user-provided PDFs, not redistributed)",
        "courses": courses,
        "exam_patterns": exams,
        "combined_exams": combined,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1))

    print(f"courses parsed:        {len(courses)}  (with sections: {len(with_sections)})")
    print(f"sections total:        {total_secs}  (invalid: {stats['invalid']}, shared-instructor rows: {stats['instructor_shared']})")
    print(f"cross-listed rows:     {sum(len(c['cross_listed']) for c in courses)}")
    print(f"exam patterns:         {len(exams)}")
    print(f"combined exam courses: {len(combined)}")

    def find(code):
        return next((c for c in courses if c["code"] == code), None)

    a = find("ACCT 100")
    assert a and len(a["sections"]) == 8, f"ACCT 100: {a and len(a['sections'])}"
    s1 = a["sections"][0]
    assert s1["days_raw"] == "MW" and s1["start"] == "12:30" and s1["end"] == "13:45" and s1["room"] == "A-1", s1
    an = find("ANTH 100")
    assert an and len(an["sections"]) == 2 and an["sections"][1]["room"] == "10-301", an
    cx = find("CS 5309")
    assert cx and cx["cross_listed"] == ["AI 624"], cx
    bio = find("BIO 300")
    assert bio and len(bio["sections"]) >= 2, bio
    print("spot checks: PASS (ACCT 100 x8, ANTH 100 rooms, CS 5309 w/ AI 624, BIO 300 multi-section)")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
