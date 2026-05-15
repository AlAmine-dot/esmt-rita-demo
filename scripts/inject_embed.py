#!/usr/bin/env python3
"""Injecte le script tag Yeekai Embed dans tous les HTML d'un clone.

Idempotent : si le clone contient déjà notre snippet, skip ce fichier (sauf
pour stripper des scripts legacy s'ils sont encore présents).

À lancer après chaque clone wget d'un nouveau site.

Usage:
    python scripts/inject_embed.py \\
        --clone-dir bakeli-clone \\
        --tenant bakeli \\
        --app-url https://yeekai-embed-ai-front.vercel.app/bakeli \\
        --disclaimer-target https://bakeli.tech \\
        [--embed-cdn https://yeekai-embed-js.vercel.app/v1/embed.js]

Comportement :
  1. Strip les anciens snippets legacy (`<script src="../path/app.js">` et
     `<script src="../path/*-config.js">`) à TOUTES profondeurs de chemin
     relatif (../, ../../, ../../../, etc.).
  2. Injecte le snippet Yeekai Embed avant `</body>` (fallback : avant
     `</html>`, sinon append).
  3. Idempotent : 2e run = 0 modifications (sauf si du legacy a réapparu).
"""
from __future__ import annotations

import argparse
import re
import time
from pathlib import Path

DEFAULT_CDN_URL = "https://yeekai-embed-js.vercel.app/v1/embed.js"

EMBED_SNIPPET_TEMPLATE = """
<!-- Yeekai Embed (injected by scripts/inject_embed.py) -->
<script src="{cdn_url}"
        data-tenant="{tenant}"
        data-app-url="{app_url}"
        data-disclaimer-target="{disclaimer_target}"
        async></script>
<!-- End Yeekai Embed -->
"""

# Matche n'importe quel <script src="...{ANY_PATH}/{LEGACY_NAME}.js"></script>,
# peu importe la profondeur des `../`, peu importe les attributs additionnels
# (type, crossorigin, etc.). Le src peut aussi être en chemin absolu/URL.
LEGACY_SCRIPT_PATTERN = re.compile(
    r'<script[^>]*\bsrc="[^"]*(?:bakeli-config|breedj-config|config|app)\.js"[^>]*>\s*</script>\s*',
    re.IGNORECASE,
)

# Matche les <link> vers rita-widget.css ou khady-theme.css (head section)
LEGACY_CSS_LINK_PATTERN = re.compile(
    r'<link[^>]*\bhref="[^"]*(?:rita-widget|khady-theme)\.css"[^>]*/?>\s*',
    re.IGNORECASE,
)

# Matche le bloc HTML widget legacy : depuis le commentaire SÉPARATEUR body
# "<!-- ─── Widget Rita ─── -->" jusqu'à </aside> (close du #rita-panel).
#
# ⚠️ Le ─ (caractère box-drawing U+2500) est OBLIGATOIRE dans le pattern.
# Sans lui, la regex matchait aussi le commentaire du <head>
# "<!-- Widget Rita/Khady (injecté par-dessus le clone Bakeli) -->" et
# gobait TOUT le contenu Bakeli entre les deux comments jusqu'au premier
# </aside> du body (bug 2026-05-15). Le ─ n'est jamais utilisé dans le head
# comment, c'est notre disambiguation.
LEGACY_WIDGET_HTML_PATTERN = re.compile(
    r'<!--\s*─[─\s]*Widget Rita[\s\S]*?</aside>\s*',
    re.IGNORECASE,
)

# Matche les <style> blocks qui contiennent "scrollbar-width: auto" — c'est
# le bloc de restoration scrollbar inline qu'on avait ajouté côté breedj.
LEGACY_SCROLLBAR_STYLE_PATTERN = re.compile(
    r'<style>\s*(?:/\*[\s\S]*?\*/\s*)?html\s*\{\s*scrollbar-width:\s*auto;[\s\S]*?</style>\s*',
    re.IGNORECASE,
)

# Matche les commentaires HTML résiduels "<!-- ... Widget Rita ... -->"
# (souvent dans le head, avant les <link> CSS). Appliqué APRÈS les autres
# patterns pour ne pas avaler le marker de WIDGET_HTML_PATTERN par erreur.
LEGACY_HEAD_COMMENT_PATTERN = re.compile(
    r'<!--[^<]*Widget Rita[^>]*-->\s*',
    re.IGNORECASE,
)

# Détecte notre embed déjà injecté pour l'idempotence
ALREADY_INJECTED_MARKER = "Yeekai Embed (injected by"


def process_html(
    html_path: Path,
    tenant: str,
    app_url: str,
    disclaimer_target: str,
    cdn_url: str,
) -> tuple[bool, list[str]]:
    """Returns (modified, changes_log)."""
    try:
        content = html_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Certains clones wget peuvent avoir des HTML latin-1 par accident.
        # On essaie avec errors=replace.
        content = html_path.read_text(encoding="utf-8", errors="replace")

    changes: list[str] = []
    legacy_matches = []

    # 1a. Strip legacy scripts (../app.js, ../bakeli-config.js, etc.)
    scripts_n = len(LEGACY_SCRIPT_PATTERN.findall(content))
    if scripts_n:
        content = LEGACY_SCRIPT_PATTERN.sub("", content)
        changes.append(f"removed {scripts_n} legacy script(s)")
        legacy_matches.append("scripts")

    # 1b. Strip legacy widget HTML (Rita FAB + panel + teaser + backdrop + scrollbar)
    widget_n = len(LEGACY_WIDGET_HTML_PATTERN.findall(content))
    if widget_n:
        content = LEGACY_WIDGET_HTML_PATTERN.sub("", content)
        changes.append(f"removed {widget_n} legacy widget HTML block(s)")
        legacy_matches.append("html")

    # 1c. Strip legacy CSS links (rita-widget.css, khady-theme.css)
    css_n = len(LEGACY_CSS_LINK_PATTERN.findall(content))
    if css_n:
        content = LEGACY_CSS_LINK_PATTERN.sub("", content)
        changes.append(f"removed {css_n} legacy CSS link(s)")
        legacy_matches.append("css")

    # 1d. Strip inline scrollbar-restore <style> blocks (breedj specific)
    style_n = len(LEGACY_SCROLLBAR_STYLE_PATTERN.findall(content))
    if style_n:
        content = LEGACY_SCROLLBAR_STYLE_PATTERN.sub("", content)
        changes.append(f"removed {style_n} legacy scrollbar style(s)")
        legacy_matches.append("style")

    # 1e. Strip head comments résiduels qui contiennent "Widget Rita"
    #     (souvent juste avant les <link> CSS qu'on a déjà strip)
    comment_n = len(LEGACY_HEAD_COMMENT_PATTERN.findall(content))
    if comment_n:
        content = LEGACY_HEAD_COMMENT_PATTERN.sub("", content)
        changes.append(f"removed {comment_n} legacy head comment(s)")
        legacy_matches.append("comments")

    # 2. Skip injection si embed déjà présent (mais on persist quand même
    #    le fichier si du legacy a été strip)
    if ALREADY_INJECTED_MARKER in content:
        if changes:
            html_path.write_text(content, encoding="utf-8")
            return True, changes + ["(embed already present, skipped re-injection)"]
        return False, []

    # 3. Inject le snippet
    snippet = EMBED_SNIPPET_TEMPLATE.format(
        cdn_url=cdn_url,
        tenant=tenant,
        app_url=app_url,
        disclaimer_target=disclaimer_target,
    )
    if "</body>" in content:
        content = content.replace("</body>", f"{snippet}\n</body>", 1)
    elif "</html>" in content:
        content = content.replace("</html>", f"{snippet}\n</html>", 1)
    else:
        content = content + snippet

    html_path.write_text(content, encoding="utf-8")
    changes.append("embed injected")
    return True, changes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inject Yeekai Embed snippet into all HTML files of a clone."
    )
    parser.add_argument("--clone-dir", required=True, type=Path,
                        help="Directory containing the cloned site (HTML files).")
    parser.add_argument("--tenant", required=True,
                        help="Tenant slug (must match a row in DB tenants table).")
    parser.add_argument("--app-url", required=True,
                        help="Iframe app URL (the React front IA, with optional /tenant suffix).")
    parser.add_argument("--disclaimer-target", required=True,
                        help="URL of the official site (shown in disclaimer 'Site officiel →').")
    parser.add_argument("--embed-cdn", default=DEFAULT_CDN_URL,
                        help=f"CDN URL of embed.js (default: {DEFAULT_CDN_URL}).")
    parser.add_argument("--quiet", action="store_true",
                        help="Print only the summary, not per-file logs.")
    args = parser.parse_args()

    if not args.clone_dir.is_dir():
        raise SystemExit(f"Not a directory: {args.clone_dir}")

    html_files = list(args.clone_dir.rglob("*.html"))
    if not html_files:
        raise SystemExit(f"No .html files found in {args.clone_dir}")

    print(f"Found {len(html_files)} HTML files in {args.clone_dir}")
    print(f"Tenant: {args.tenant}, app_url: {args.app_url}")
    print(f"CDN: {args.embed_cdn}")
    print()

    t0 = time.monotonic()
    modified = 0
    for f in html_files:
        rel = f.relative_to(args.clone_dir)
        was_modified, changes = process_html(
            f, args.tenant, args.app_url, args.disclaimer_target, args.embed_cdn,
        )
        if was_modified:
            modified += 1
            if not args.quiet:
                print(f"  ✓ {rel} — {'; '.join(changes)}")

    elapsed = time.monotonic() - t0
    print()
    print(f"Done: {modified}/{len(html_files)} files modified in {elapsed:.2f}s")


if __name__ == "__main__":
    main()
