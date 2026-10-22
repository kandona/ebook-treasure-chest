"""Generate the static search page without changing the catalogue or its links."""
import json
from collections import Counter
from html import escape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent.parent
ALL_BOOKS_FILE = ROOT / "docs" / "all-books.json"
OUTPUT_HTML = ROOT / "docs" / "index.html"
OUTPUT_JSON = ROOT / "docs" / "books.json"
TEMPLATE_FILE = ROOT / "scripts" / "templates" / "search.html"


def main():
    # Fail before writing outputs if the input is missing or malformed.
    books = json.loads(ALL_BOOKS_FILE.read_text(encoding="utf-8"))
    if not isinstance(books, list) or any(not isinstance(book, dict) for book in books):
        raise ValueError("all-books.json must contain an array of book records")
    categories = Counter(str(book.get("category") or "未分类") for book in books)
    category_buttons = "".join(
        '<button type="button" class="category-button" data-category="{}" '
        'aria-pressed="false">{}</button>'.format(escape(category, quote=True), escape(category))
        for category, _ in categories.most_common(8)
    )
    page = Template(TEMPLATE_FILE.read_text(encoding="utf-8")).substitute(
        total_books=f"{len(books):,}",
        total_categories=f"{len(categories):,}",
        category_buttons=category_buttons,
    )
    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_HTML.write_text(page, encoding="utf-8")
    OUTPUT_JSON.write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated search page: {len(books):,} records / {len(categories):,} categories")


if __name__ == "__main__":
    main()
