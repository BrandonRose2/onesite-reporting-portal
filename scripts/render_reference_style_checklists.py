from __future__ import annotations

import re
import shutil
from pathlib import Path

import markdown
from bs4 import BeautifulSoup
from weasyprint import CSS, HTML


SOURCE_DIR = Path("/home/ubuntu/markdown-checklists-pdf-source/md")
OUTPUT_DIR = Path("/home/ubuntu/manager-checklists-reference-style-pdf")

STYLE = """
@page {
  size: Letter landscape;
  margin: 0.24in 0.28in 0.28in 0.28in;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 7.1pt;
  line-height: 1.17;
}

h1 {
  margin: 0 0 1px;
  color: #101820;
  font-size: 15.2pt;
  font-weight: 700;
  letter-spacing: -0.18pt;
}
h1 + blockquote {
  margin: 0 0 10px;
  padding: 0;
  border: 0;
  color: #303943;
  font-size: 6.7pt;
  line-height: 1.18;
}
h1 + blockquote p { margin: 0; }

h2 {
  margin: 11px 0 5px;
  color: #214f6e;
  font-size: 10.2pt;
  font-weight: 700;
  line-height: 1.08;
  page-break-after: avoid;
}
h2 + blockquote {
  margin: 0 0 5px;
  padding: 0;
  border: 0;
  color: #303943;
  font-size: 6.55pt;
  line-height: 1.16;
}
h2 + blockquote p { margin: 0; }

p { margin: 3px 0; }
ul { margin: 3px 0 6px 0; padding: 0; list-style: none; }
li { margin: 3px 0; padding-left: 19px; text-indent: -19px; }
li::first-letter { font-size: 10pt; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 4px 0 7px;
  table-layout: fixed;
  page-break-inside: auto;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; page-break-after: auto; }
th, td {
  border: 0.45px solid #b8c2ca;
  padding: 2.1px 4px;
  vertical-align: middle;
  overflow-wrap: break-word;
  word-break: normal;
}
th {
  background: #194765;
  color: #ffffff;
  font-size: 6.8pt;
  font-weight: 700;
  text-align: left;
}
td { font-size: 6.65pt; }
tbody tr:nth-child(even) td { background: #f2f6f8; }

table.summary-table td:first-child { width: 34%; font-weight: 600; }
table.summary-table td:last-child { width: 66%; }
table.call-details tbody td:last-child { background: #dce7ff; min-height: 14px; }
table.call-details tbody tr:first-child td:last-child { background: #ffffff; }

table.availability-table td { font-size: 6.8pt; }
table.resident-table th, table.resident-table td { font-size: 6.15pt; line-height: 1.12; padding: 2px 3px; }
table.resident-table th:nth-child(1), table.resident-table td:nth-child(1) { width: 6%; }
table.resident-table th:nth-child(2), table.resident-table td:nth-child(2) { width: 18%; }
table.resident-table th:nth-child(3), table.resident-table td:nth-child(3) { width: 12%; }
table.resident-table th:nth-child(4), table.resident-table td:nth-child(4) { width: 11%; }
table.resident-table th:nth-child(5), table.resident-table td:nth-child(5) { width: 10%; }
table.resident-table th:nth-child(6), table.resident-table td:nth-child(6) { width: 9%; }
table.resident-table th:nth-child(7), table.resident-table td:nth-child(7) { width: 21%; }
table.resident-table th:nth-child(8), table.resident-table td:nth-child(8) { width: 5%; }
table.resident-table td:nth-child(4), table.resident-table td:nth-child(5), table.resident-table td:nth-child(6) { white-space: nowrap; }
table.resident-table td:nth-child(7) { white-space: nowrap; }

.manager-commitments {
  border-top: 0.8px solid #c3ccd3;
  padding-top: 4px;
}
.manager-commitments p { margin: 4px 0; }
.footer-note {
  margin-top: 8px;
  color: #5b6570;
  font-size: 5.8pt;
  font-style: italic;
}
"""


def compact_text(node):
    for text_node in node.find_all(string=True):
        replacement = text_node.replace("[ ]", "☐")
        replacement = replacement.replace("  ", " ")
        text_node.replace_with(replacement)


def decorate_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    for index, table in enumerate(tables):
        classes = table.get("class", [])
        if index == 0:
            classes.extend(["summary-table", "call-details"])
        elif index == 1:
            classes.append("summary-table")
        elif index == 2:
            classes.append("availability-table")
        else:
            classes.append("resident-table")
        table["class"] = classes

    for heading in soup.find_all("h2"):
        if heading.get_text(" ", strip=True) == "Manager Summary & Commitments":
            sibling = heading.find_next_sibling()
            if sibling:
                sibling["class"] = sibling.get("class", []) + ["manager-commitments"]

    for paragraph in soup.find_all("p"):
        if paragraph.get_text(" ", strip=True).startswith("Generated from the property's supplied"):
            paragraph["class"] = paragraph.get("class", []) + ["footer-note"]

    compact_text(soup)
    return str(soup)


def render(markdown_path: Path, pdf_path: Path) -> None:
    markdown_text = markdown_path.read_text(encoding="utf-8")
    body = markdown.markdown(markdown_text, extensions=["tables", "sane_lists"])
    document = f"<!doctype html><html><head><meta charset='utf-8'></head><body>{decorate_html(body)}</body></html>"
    HTML(string=document, base_url=str(markdown_path.parent)).write_pdf(str(pdf_path), stylesheets=[CSS(string=STYLE)])


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Source directory not found: {SOURCE_DIR}")
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown_files = sorted(SOURCE_DIR.glob("*.md"))
    if len(markdown_files) != 35:
        raise SystemExit(f"Expected 35 Markdown files, found {len(markdown_files)}")
    for markdown_path in markdown_files:
        render(markdown_path, OUTPUT_DIR / f"{markdown_path.stem}.pdf")
    print(f"Rendered {len(markdown_files)} reference-style PDFs to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
