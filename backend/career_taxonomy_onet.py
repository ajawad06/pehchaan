"""
Auto-generated from O*NET 30.3 Database (May 2026 release, CC BY 4.0).
RIASEC scores: normalized from the OI (Occupational Interests) scale, 1-7 -> 0-1.
required_skills: abilities normalized from IM (Importance) scale 1-5 -> 0-1;
work-style traits normalized from WI (Work Styles Impact) scale -3..3 -> 0-1.
Source occupation title/code included per entry for traceability.
"""

CAREER_TAXONOMY = {
    "Software Engineering": {
        "onet_code": "15-1252.00",
        "onet_title": "Software Developers",
        "riasec": {"R": 0.516, "I": 0.864, "A": 0.339, "S": 0.259, "E": 0.267, "C": 0.803},
        "required_skills": {
            "logical_reasoning": 0.75,
            "numerical_reasoning": 0.576,
            "memory": 0.45,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.7,
            "creativity": 0.918,
            "persistence": 0.795,
            "leadership": 0.688,
            "empathy": 0.568,
            "attention_to_detail": 0.945,
            "learning_agility": 0.848
        },
    },
    "Computer Science / Research": {
        "onet_code": "15-1221.00",
        "onet_title": "Computer and Information Research Scientists",
        "riasec": {"R": 0.534, "I": 1.0, "A": 0.421, "S": 0.286, "E": 0.356, "C": 0.686},
        "required_skills": {
            "logical_reasoning": 0.824,
            "numerical_reasoning": 0.676,
            "memory": 0.576,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.75,
            "creativity": 0.972,
            "persistence": 0.835,
            "leadership": 0.672,
            "empathy": 0.55,
            "attention_to_detail": 0.917,
            "learning_agility": 0.883
        },
    },
    "Data Science": {
        "onet_code": "15-2051.00",
        "onet_title": "Data Scientists",
        "riasec": {"R": 0.31, "I": 0.997, "A": 0.373, "S": 0.237, "E": 0.244, "C": 0.77},
        "required_skills": {
            "logical_reasoning": 0.776,
            "numerical_reasoning": 0.95,
            "memory": 0.55,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.8,
            "creativity": 0.903,
            "persistence": 0.805,
            "leadership": 0.56,
            "empathy": 0.522,
            "attention_to_detail": 0.998,
            "learning_agility": 0.81
        },
        "_abilities_note": "abilities borrowed from Statisticians (15-2041.00) - no rating data yet for 15-2051.00",
    },
    "Artificial Intelligence / ML": {
        "onet_code": "15-1221.00",
        "onet_title": "Computer and Information Research Scientists",
        "riasec": {"R": 0.534, "I": 1.0, "A": 0.421, "S": 0.286, "E": 0.356, "C": 0.686},
        "required_skills": {
            "logical_reasoning": 0.824,
            "numerical_reasoning": 0.676,
            "memory": 0.576,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.75,
            "creativity": 0.972,
            "persistence": 0.835,
            "leadership": 0.672,
            "empathy": 0.55,
            "attention_to_detail": 0.917,
            "learning_agility": 0.883
        },
        "_caveat": "No distinct AI/ML occupation exists in O*NET yet - using Computer and Information Research Scientists as proxy. Distinguish from Data Science/CS in your Tier 2 disambiguation activities, not in this data.",
    },
    "Cybersecurity": {
        "onet_code": "15-1212.00",
        "onet_title": "Information Security Analysts",
        "riasec": {"R": 0.509, "I": 0.771, "A": 0.191, "S": 0.301, "E": 0.407, "C": 0.869},
        "required_skills": {
            "logical_reasoning": 0.8,
            "numerical_reasoning": 0.55,
            "memory": 0.45,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.776,
            "creativity": 0.893,
            "persistence": 0.858,
            "leadership": 0.693,
            "empathy": 0.553,
            "attention_to_detail": 1.0,
            "learning_agility": 0.848
        },
    },
    "Medicine (MBBS)": {
        "onet_code": "29-1215.00",
        "onet_title": "Family Medicine Physicians",
        "riasec": {"R": 0.536, "I": 0.869, "A": 0.207, "S": 0.887, "E": 0.334, "C": 0.564},
        "required_skills": {
            "logical_reasoning": 0.85,
            "numerical_reasoning": 0.55,
            "memory": 0.476,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.8,
            "creativity": 0.722,
            "persistence": 0.858,
            "leadership": 0.85,
            "empathy": 0.928,
            "attention_to_detail": 1.0,
            "learning_agility": 0.83
        },
    },
    "Pharmacy": {
        "onet_code": "29-1051.00",
        "onet_title": "Pharmacists",
        "riasec": {"R": 0.403, "I": 0.81, "A": 0.211, "S": 0.697, "E": 0.374, "C": 0.651},
        "required_skills": {
            "logical_reasoning": 0.776,
            "numerical_reasoning": 0.65,
            "memory": 0.6,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.776,
            "creativity": 0.662,
            "persistence": 0.795,
            "leadership": 0.68,
            "empathy": 0.85,
            "attention_to_detail": 1.0,
            "learning_agility": 0.725
        },
    },
    "Nursing / Allied Health": {
        "onet_code": "29-1141.00",
        "onet_title": "Registered Nurses",
        "riasec": {"R": 0.494, "I": 0.673, "A": 0.191, "S": 0.796, "E": 0.34, "C": 0.679},
        "required_skills": {
            "logical_reasoning": 0.824,
            "numerical_reasoning": 0.6,
            "memory": 0.624,
            "spatial_reasoning": 0.3,
            "verbal_reasoning": 0.75,
            "creativity": 0.7,
            "persistence": 0.847,
            "leadership": 0.747,
            "empathy": 0.878,
            "attention_to_detail": 1.0,
            "learning_agility": 0.875
        },
    },
    "Civil Engineering": {
        "onet_code": "17-2051.00",
        "onet_title": "Civil Engineers",
        "riasec": {"R": 0.919, "I": 0.736, "A": 0.316, "S": 0.241, "E": 0.38, "C": 0.659},
        "required_skills": {
            "logical_reasoning": 0.8,
            "numerical_reasoning": 0.776,
            "memory": 0.524,
            "spatial_reasoning": 0.376,
            "verbal_reasoning": 0.8,
            "creativity": 0.828,
            "persistence": 0.795,
            "leadership": 0.835,
            "empathy": 0.568,
            "attention_to_detail": 0.928,
            "learning_agility": 0.81
        },
    },
    "Electrical / Mechanical Engineering": {
        "onet_code": "17-2071.00",
        "onet_title": "Electrical Engineers",
        "riasec": {"R": 0.86, "I": 0.779, "A": 0.303, "S": 0.246, "E": 0.349, "C": 0.633},
        "required_skills": {
            "logical_reasoning": 0.8,
            "numerical_reasoning": 0.7,
            "memory": 0.55,
            "spatial_reasoning": 0.224,
            "verbal_reasoning": 0.824,
            "creativity": 0.883,
            "persistence": 0.778,
            "leadership": 0.715,
            "empathy": 0.565,
            "attention_to_detail": 0.957,
            "learning_agility": 0.757
        },
        "_caveat": "Merged into one entry using Electrical Engineers' data only. Split into two separate taxonomy entries if you want to distinguish them - Mechanical Engineers (17-2141.00) is available in the same database.",
    },
    "Law (LLB)": {
        "onet_code": "23-1011.00",
        "onet_title": "Lawyers",
        "riasec": {"R": 0.16, "I": 0.626, "A": 0.343, "S": 0.497, "E": 0.787, "C": 0.656},
        "required_skills": {
            "logical_reasoning": 0.824,
            "numerical_reasoning": 0.524,
            "memory": 0.576,
            "spatial_reasoning": 0.224,
            "verbal_reasoning": 0.9,
            "creativity": 0.717,
            "persistence": 0.877,
            "leadership": 0.83,
            "empathy": 0.652,
            "attention_to_detail": 0.938,
            "learning_agility": 0.72
        },
    },
    "Civil Service (CSS)": {
        "onet_code": "19-3094.00",
        "onet_title": "Political Scientists",
        "riasec": {"R": 0.143, "I": 0.959, "A": 0.553, "S": 0.489, "E": 0.516, "C": 0.503},
        "required_skills": {
            "logical_reasoning": 0.75,
            "numerical_reasoning": 0.6,
            "memory": 0.576,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.8,
            "creativity": 0.815,
            "persistence": 0.763,
            "leadership": 0.663,
            "empathy": 0.6,
            "attention_to_detail": 0.865,
            "learning_agility": 0.81
        },
        "_caveat": "Mapped to Political Scientists as closest English-language O*NET proxy. Pakistan's CSS exam/grading system has no O*NET equivalent - review this entry by hand.",
    },
    "Business Administration": {
        "onet_code": "11-1021.00",
        "onet_title": "General and Operations Managers",
        "riasec": {"R": 0.314, "I": 0.339, "A": 0.184, "S": 0.483, "E": 1.0, "C": 0.763},
        "required_skills": {
            "logical_reasoning": 0.776,
            "numerical_reasoning": 0.576,
            "memory": 0.45,
            "spatial_reasoning": 0.3,
            "verbal_reasoning": 0.8,
            "creativity": 0.767,
            "persistence": 0.865,
            "leadership": 0.988,
            "empathy": 0.703,
            "attention_to_detail": 0.79,
            "learning_agility": 0.842
        },
    },
    "Chartered Accountancy / Finance": {
        "onet_code": "13-2011.00",
        "onet_title": "Accountants and Auditors",
        "riasec": {"R": 0.163, "I": 0.51, "A": 0.154, "S": 0.304, "E": 0.553, "C": 1.0},
        "required_skills": {
            "logical_reasoning": 0.75,
            "numerical_reasoning": 0.676,
            "memory": 0.476,
            "spatial_reasoning": 0.224,
            "verbal_reasoning": 0.75,
            "creativity": 0.585,
            "persistence": 0.795,
            "leadership": 0.638,
            "empathy": 0.542,
            "attention_to_detail": 1.0,
            "learning_agility": 0.603
        },
    },
    "Entrepreneurship": {
        "onet_code": "11-1021.00",
        "onet_title": "General and Operations Managers",
        "riasec": {"R": 0.314, "I": 0.339, "A": 0.184, "S": 0.483, "E": 1.0, "C": 0.763},
        "required_skills": {
            "logical_reasoning": 0.776,
            "numerical_reasoning": 0.576,
            "memory": 0.45,
            "spatial_reasoning": 0.3,
            "verbal_reasoning": 0.8,
            "creativity": 0.767,
            "persistence": 0.865,
            "leadership": 0.988,
            "empathy": 0.703,
            "attention_to_detail": 0.79,
            "learning_agility": 0.842
        },
        "_caveat": "No direct O*NET occupation exists for 'entrepreneur' - using General and Operations Managers as proxy (same as Business Administration). Consider merging these two or hand-adjusting one to differentiate.",
    },
    "Architecture": {
        "onet_code": "17-1011.00",
        "onet_title": "Architects, Except Landscape and Naval",
        "riasec": {"R": 0.703, "I": 0.554, "A": 0.59, "S": 0.361, "E": 0.521, "C": 0.634},
        "required_skills": {
            "logical_reasoning": 0.8,
            "numerical_reasoning": 0.65,
            "memory": 0.576,
            "spatial_reasoning": 0.45,
            "verbal_reasoning": 0.8,
            "creativity": 0.918,
            "persistence": 0.778,
            "leadership": 0.755,
            "empathy": 0.632,
            "attention_to_detail": 0.95,
            "learning_agility": 0.74
        },
    },
    "UX/UI Design": {
        "onet_code": "15-1255.00",
        "onet_title": "Web and Digital Interface Designers",
        "riasec": {"R": 0.37, "I": 0.697, "A": 0.64, "S": 0.314, "E": 0.447, "C": 0.629},
        "required_skills": {
            "logical_reasoning": 0.65,
            "numerical_reasoning": 0.4,
            "memory": 0.4,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.7,
            "creativity": 0.918,
            "persistence": 0.768,
            "leadership": 0.607,
            "empathy": 0.64,
            "attention_to_detail": 0.928,
            "learning_agility": 0.883
        },
        "_abilities_note": "abilities borrowed from Graphic Designers (27-1024.00) - no rating data yet for 15-1255.00",
    },
    "Visual & Fine Arts": {
        "onet_code": "27-1013.00",
        "onet_title": "Fine Artists, Including Painters, Sculptors, and Illustrators",
        "riasec": {"R": 0.579, "I": 0.383, "A": 1.0, "S": 0.326, "E": 0.339, "C": 0.334},
        "required_skills": {
            "logical_reasoning": 0.6,
            "numerical_reasoning": 0.424,
            "memory": 0.35,
            "spatial_reasoning": 0.2,
            "verbal_reasoning": 0.576,
            "creativity": 1.0,
            "persistence": 0.778,
            "leadership": 0.457,
            "empathy": 0.562,
            "attention_to_detail": 0.717,
            "learning_agility": 0.715
        },
    },
    "Creative Writing / Journalism / Media": {
        "onet_code": "27-3043.00",
        "onet_title": "Writers and Authors",
        "riasec": {"R": 0.143, "I": 0.464, "A": 0.954, "S": 0.409, "E": 0.679, "C": 0.477},
        "required_skills": {
            "logical_reasoning": 0.624,
            "numerical_reasoning": 0.276,
            "memory": 0.476,
            "spatial_reasoning": 0.25,
            "verbal_reasoning": 0.924,
            "creativity": 0.975,
            "persistence": 0.768,
            "leadership": 0.618,
            "empathy": 0.678,
            "attention_to_detail": 0.755,
            "learning_agility": 0.792
        },
    },
    "Teaching / Education": {
        "onet_code": "25-2031.00",
        "onet_title": "Secondary School Teachers, Except Special and Career/Technical Education",
        "riasec": {"R": 0.39, "I": 0.456, "A": 0.539, "S": 1.0, "E": 0.414, "C": 0.516},
        "required_skills": {
            "logical_reasoning": 0.776,
            "numerical_reasoning": 0.6,
            "memory": 0.576,
            "spatial_reasoning": 0.25,
            "verbal_reasoning": 0.8,
            "creativity": 0.717,
            "persistence": 0.847,
            "leadership": 0.768,
            "empathy": 0.878,
            "attention_to_detail": 0.793,
            "learning_agility": 0.842
        },
    },
    "Psychology": {
        "onet_code": "19-3033.00",
        "onet_title": "Clinical and Counseling Psychologists",
        "riasec": {"R": 0.15, "I": 0.797, "A": 0.437, "S": 0.939, "E": 0.379, "C": 0.499},
        "required_skills": {
            "logical_reasoning": 0.8,
            "numerical_reasoning": 0.45,
            "memory": 0.55,
            "spatial_reasoning": 0.224,
            "verbal_reasoning": 0.85,
            "creativity": 0.733,
            "persistence": 0.828,
            "leadership": 0.663,
            "empathy": 1.0,
            "attention_to_detail": 0.933,
            "learning_agility": 0.83
        },
    },
}


def riasec_similarity(user_riasec: dict, career_riasec: dict) -> float:
    """
    Cosine similarity between the user's measured RIASEC vector and a
    career's real O*NET RIASEC profile. Both dicts use keys R,I,A,S,E,C
    with values in [0,1]. Returns a similarity score in [0,1].
    Replaces the old tag-matching interest_match() - use this instead.
    """
    letters = ["R", "I", "A", "S", "E", "C"]
    u = [user_riasec.get(l, 0.0) for l in letters]
    c = [career_riasec.get(l, 0.0) for l in letters]
    dot = sum(a * b for a, b in zip(u, c))
    norm_u = sum(a * a for a in u) ** 0.5
    norm_c = sum(a * a for a in c) ** 0.5
    if norm_u == 0 or norm_c == 0:
        return 0.0
    return dot / (norm_u * norm_c)


def ability_match(user_abilities: dict, required_skills: dict) -> float:
    """
    Weighted match between what the user actually measured on each skill
    and what the career requires. Unmeasured skills are dropped from the
    weighted average entirely (not defaulted to 0.5 or 0) so an
    incomplete profile doesn't silently distort the score - fixed careers
    to only reflect skills you actually have data for.
    """
    total_weight, total_score = 0.0, 0.0
    for skill, required_level in required_skills.items():
        if skill in user_abilities:
            total_weight += required_level
            total_score += required_level * user_abilities[skill]
    if total_weight == 0:
        return 0.0
    return total_score / total_weight


def recommend_careers(user_riasec: dict, user_abilities: dict, taxonomy: dict = CAREER_TAXONOMY,
                       interest_floor: float = 0.15) -> list:
    """
    Real replacement for /recommend_careers scoring logic.
    interest_floor: below this RIASEC similarity, a career is heavily
    suppressed rather than just discounted (fixes 'arts interest -> Medicine' bug).
    """
    results = []
    for career, entry in taxonomy.items():
        interest_score = riasec_similarity(user_riasec, entry["riasec"])
        ability_score = ability_match(user_abilities, entry["required_skills"])
        if interest_score < interest_floor:
            compatibility = ability_score * 0.15
        else:
            compatibility = (interest_score * 0.4) + (ability_score * 0.6)
        results.append({
            "career": career,
            "compatibility": round(compatibility * 100, 1),
            "interest_match": round(interest_score * 100, 1),
            "ability_match": round(ability_score * 100, 1),
            "onet_code": entry["onet_code"],
        })
    results.sort(key=lambda x: -x["compatibility"])
    return results
