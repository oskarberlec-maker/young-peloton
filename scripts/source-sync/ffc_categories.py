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


# Road codes whose official Annexe II label names only non-U19 categories
# (same source as above). Used solely to drop calendar entries from the review
# list, never to change or publish a race. Labels that do not name a category
# (course de club, gentleman, corporatif, circuit fermé, divers, Avenir,
# Outre-Mer, contre-la-montre pour toutes et tous, brevet jeune cycliste) and
# every U19/junior code stay out on purpose and remain in review.
NON_JUNIOR_CODES = {
    # Elite / Open / Access
    **dict.fromkeys(('1.12.1', '1.12.4', '1.12.5', '1.12.6', '1.12.7', '1.24', '1.24.1', '1.24.2', '1.25',
                     '1.25.1', '1.27', '1.27.2', '1.27.3', '1.27.4', '2.12.1', '2.12.4', '2.12.5', '2.12.6',
                     '2.12.7', '2.24', '2.24.1', '2.24.2', '2.25', '2.25.1', '2.27'), 'Elite/Open/Access'),
    **dict.fromkeys(('1.13', '1.28', '2.13', '2.28'), 'U23'),
    **dict.fromkeys(('1.23', '1.33', '1.51', '2.23'), 'Masters'),
    **dict.fromkeys(('1.15', '1.34', '1.34.1', '1.34.2', '1.34.3', '1.34.4', '2.15', '2.34'), 'Femmes (non U19)'),
    **dict.fromkeys(('1.30', '1.31', '1.36', '1.37', '1.45', '1.45.2', '1.45.3', '1.45.4', '1.45.5', '1.45.6'),
                    'U17 and younger'),
    **dict.fromkeys(('1.41.1', '1.41.2', '1.41.3'), 'Professional criterium'),
    **dict.fromkeys(('1.42.2', '1.43', '2.43', '1.61.1', '1.61.2', '1.61.3', '3.940'), 'Cyclosportive/randonnée'),
    # Championships and cups of other categories
    **dict.fromkeys(('3.0', '3.5', '3.6', '3.7', '3.20', '3.22', '3.27', '3.28', '3.28.2', '3.28.3', '3.38', '3.39',
                     '3.40', '3.41', '3.44', '3.49', '3.60.1', '3.62.1', '3.80', '3.81'), 'Elite/Open/Access championship'),
    **dict.fromkeys(('3.1', '3.21', '3.42', '3.43', '3.60', '3.62', '3.82', '3.83'), 'U23 championship'),
    **dict.fromkeys(('3.26', '3.47', '3.47.1', '3.47.2', '3.47.3', '3.47.4', '3.61'), 'Masters championship'),
    **dict.fromkeys(('3.3', '3.4', '3.12', '3.13', '3.24', '3.25', '3.32', '3.33', '3.34', '3.48', '3.48.1',
                     '3.48.2', '3.48.3', '3.53', '3.53.1', '3.65', '3.68', '3.69'), 'U17 and younger'),
    **dict.fromkeys(('3.10', '3.30', '3.50', '3.50.1', '3.51', '3.66', '3.66.1', '3.66.2', '3.67', '3.67.1',
                     '3.67.2', '3.70', '3.70.1', '3.71', '3.73.1', '3.73.2', '3.90', '3.91', '3.95', '3.96'),
                    'Femmes (non U19)'),
    **dict.fromkeys(('3.54', '3.55', '3.56', '3.57', '3.58'), 'Coupe de France N1/N2/N3 (elite amateur)'),
}


def non_junior_code(value):
    """Label of an explicit non-U19 FFC road code, else None ('3.54.0' == '3.54')."""
    code = re.sub(r"\s+", ".", value.strip()).upper()
    if code not in NON_JUNIOR_CODES and code.endswith(".0"):
        code = code[:-2]
    return NON_JUNIOR_CODES.get(code)
