"""PDF text extraction and section splitting for academic papers."""

import io
import logging
import re

import httpx
from pypdf import PdfReader

logger = logging.getLogger(__name__)

MAX_PDF_SIZE = 20 * 1024 * 1024  # 20 MB
DOWNLOAD_TIMEOUT = 30.0

# Common section headers in academic papers
_SECTION_PATTERNS = [
    r"(?i)^(abstract)\s*$",
    r"(?i)^(introduction)\s*$",
    r"(?i)^(background)\s*$",
    r"(?i)^(methods?|materials?\s+and\s+methods?|experimental\s+methods?)\s*$",
    r"(?i)^(results?)\s*$",
    r"(?i)^(results?\s+and\s+discussion)\s*$",
    r"(?i)^(discussion)\s*$",
    r"(?i)^(conclusion|conclusions|concluding\s+remarks?)\s*$",
    r"(?i)^(limitations?)\s*$",
    r"(?i)^(acknowledgements?|acknowledgments?)\s*$",
    r"(?i)^(references|bibliography)\s*$",
    r"(?i)^(supplementary|supporting\s+information)\s*",
    # Numbered sections: "1. Introduction", "2 Methods", "I. Introduction"
    r"(?i)^(?:\d+\.?\s+|[IVX]+\.?\s+)(introduction|background|methods?|materials?\s+and\s+methods?|results?|discussion|conclusion|conclusions|limitations?|acknowledgements?|references)",
]

# Sections to exclude from translation
_EXCLUDE_SECTIONS = {"references", "bibliography", "acknowledgements", "acknowledgments", "supplementary", "supporting information"}


async def extract_text_from_url(pdf_url: str) -> str:
    """Download a PDF from URL and extract its text content.

    Returns the full text as a single string.
    Raises ValueError if the PDF is too large or download fails.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/pdf,*/*",
        }
        async with httpx.AsyncClient(
            timeout=DOWNLOAD_TIMEOUT,
            follow_redirects=True,
        ) as client:
            resp = await client.get(pdf_url, headers=headers)
            resp.raise_for_status()

            content_length = len(resp.content)
            if content_length > MAX_PDF_SIZE:
                raise ValueError(
                    f"PDF too large: {content_length / 1024 / 1024:.1f} MB (max {MAX_PDF_SIZE / 1024 / 1024:.0f} MB)"
                )

            pdf_bytes = io.BytesIO(resp.content)

    except httpx.HTTPStatusError as e:
        raise ValueError(f"PDF download failed: HTTP {e.response.status_code}") from e
    except httpx.TimeoutException:
        raise ValueError("PDF download timed out") from None
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"PDF download failed: {e}") from e

    # Extract text from PDF
    try:
        reader = PdfReader(pdf_bytes)
        pages_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

        full_text = "\n\n".join(pages_text)

        if not full_text.strip():
            raise ValueError("No text could be extracted from the PDF (may be image-based)")

        logger.info("Extracted %d characters from %d pages", len(full_text), len(reader.pages))
        return full_text

    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"PDF text extraction failed: {e}") from e


def split_into_sections(text: str) -> list[dict]:
    """Split extracted PDF text into logical sections.

    Returns a list of dicts: [{"name": "Introduction", "text": "..."}]
    If no section headers are detected, returns the entire text as one section.
    """
    lines = text.split("\n")
    sections: list[dict] = []
    current_name = "Full Text"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            current_lines.append("")
            continue

        # Check if this line is a section header
        matched_section = _match_section_header(stripped)
        if matched_section:
            # Save previous section
            if current_lines:
                section_text = "\n".join(current_lines).strip()
                if section_text:
                    sections.append({"name": current_name, "text": section_text})
            current_name = matched_section
            current_lines = []
        else:
            current_lines.append(line)

    # Save last section
    if current_lines:
        section_text = "\n".join(current_lines).strip()
        if section_text:
            sections.append({"name": current_name, "text": section_text})

    # If no sections were detected (only "Full Text"), return as-is
    if len(sections) <= 1:
        return [{"name": "Full Text", "text": text.strip()}]

    # Filter out unwanted sections (references, acknowledgements, etc.)
    filtered = []
    for s in sections:
        name_lower = s["name"].lower()
        if name_lower in _EXCLUDE_SECTIONS:
            continue
        # Skip very short sections (likely noise)
        if len(s["text"]) < 50:
            continue
        filtered.append(s)

    return filtered if filtered else [{"name": "Full Text", "text": text.strip()}]


def _match_section_header(line: str) -> str | None:
    """Check if a line matches a known section header pattern.

    Returns the canonical section name or None.
    """
    for pattern in _SECTION_PATTERNS:
        m = re.match(pattern, line)
        if m:
            # Extract the section name from the first capture group
            raw_name = m.group(1) if m.lastindex else line
            return _normalize_section_name(raw_name)
    return None


def _normalize_section_name(name: str) -> str:
    """Normalize section name to a canonical form."""
    name_lower = name.lower().strip()

    mapping = {
        "abstract": "Abstract",
        "introduction": "Introduction",
        "background": "Background",
        "method": "Methods",
        "methods": "Methods",
        "materials and methods": "Methods",
        "materials & methods": "Methods",
        "experimental methods": "Methods",
        "result": "Results",
        "results": "Results",
        "results and discussion": "Results and Discussion",
        "discussion": "Discussion",
        "conclusion": "Conclusion",
        "conclusions": "Conclusion",
        "concluding remarks": "Conclusion",
        "limitation": "Limitations",
        "limitations": "Limitations",
        "acknowledgement": "Acknowledgements",
        "acknowledgements": "Acknowledgements",
        "acknowledgment": "Acknowledgements",
        "acknowledgments": "Acknowledgements",
        "references": "References",
        "bibliography": "References",
        "supplementary": "Supplementary",
        "supporting information": "Supplementary",
    }

    return mapping.get(name_lower, name.title())
