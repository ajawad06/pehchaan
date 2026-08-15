from career_taxonomy_onet import recommend_careers

def show(label, riasec, abilities, n=5):
    print(f"\n=== {label} ===")
    results = recommend_careers(riasec, abilities)
    for r in results[:n]:
        print(f"  {r['career']:<45} {r['compatibility']:5.1f}%  (interest={r['interest_match']}%, ability={r['ability_match']}%)")

show(
    "Arts-leaning (A=0.9, S=0.6 | creativity+verbal+aesthetic high)",
    {'R':0.2,'I':0.4,'A':0.9,'S':0.6,'E':0.3,'C':0.2},
    {'creativity':0.9,'verbal_reasoning':0.85,'aesthetic_judgment':0.8,'communication':0.75,'empathy':0.7},
)

show(
    "Tech-leaning (I=0.9, C=0.8 | numerical+logical+attention high)",
    {'R':0.4,'I':0.9,'A':0.2,'S':0.2,'E':0.3,'C':0.8},
    {'numerical_reasoning':0.9,'logical_reasoning':0.85,'pattern_recognition':0.8,'attention_to_detail':0.9,'learning_agility':0.85},
    n=6
)

show(
    "Social/Medicine (S=0.9, I=0.7 | empathy+memory+persistence high)",
    {'R':0.3,'I':0.7,'A':0.3,'S':0.9,'E':0.3,'C':0.4},
    {'empathy':0.9,'communication':0.85,'persistence':0.8,'memory':0.8,'verbal_reasoning':0.7},
)

show(
    "Law/Verbal (E=0.8, S=0.5 | verbal+logical+communication high)",
    {'R':0.1,'I':0.5,'A':0.3,'S':0.5,'E':0.8,'C':0.6},
    {'verbal_reasoning':0.9,'logical_reasoning':0.85,'communication':0.85,'persistence':0.75,'memory':0.6},
)
