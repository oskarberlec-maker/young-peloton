"""Explicit FFC junior road codes, shared by discovery and edition checks.

Source (checked 2026-11-16): FFC Titre I, Annexe II, 20261026:
https://ffc.fr/app/uploads/sites/2/2026/06/Titre-I-Annexe-II-Organisations-au-calendrier-FFC-20261026.pdf
Only whole-event codes: stage/result suffixes E/G are deliberately excluded.
"""
import re


def junior_code(value):
    code = re.sub(r"\s+", ".", value.strip()).upper()
    if re.fullmatch(r"(?:[12]\.14(?:\.0)?|MJ\.[12]\.(?:1|2|NCUP)|3\.7[45](?:\.0)?)", code):
        sex = "U19M"
    elif re.fullmatch(r"(?:[12]\.21(?:\.0)?|WJ\.[12]\.(?:1|2|NCUP))", code):
        sex = "U19W"
    else:
        return None
    stage = code.startswith(("2.", "MJ.2.", "WJ.2.", "3.75"))
    return sex, "Stage race" if stage else "Road race"
