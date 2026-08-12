export function selectNextActivity(confidence, completed, catalog) {
    const remaining = catalog.filter(a => !completed.includes(a.id));
    if (remaining.length === 0) return null;
    
    // In a real adaptive engine, we'd use confidence to close gaps.
    // For this MVP, we return the next available activity deterministically.
    return remaining[0].id;
}

export function interpret(signals) {
    const flags = [];
    if ((signals.I || 0) > 0.7 && (signals.numerical_reasoning || 0) < 0.4) {
        flags.push({
            "type": "unexplored_interest", "field": "Investigative",
            "note": "High interest, low demonstrated aptitude — likely unexposed, not unsuited",
            "source_activity": "instinct_swipe + pattern_hunter"
        });
    }
    if ((signals.spatial || 0) > 0.75 && (signals.R || 0) < 0.4) {
        flags.push({
            "type": "hidden_strength", "field": "Realistic",
            "note": "Strong mechanical/spatial aptitude with no stated interest — worth surfacing",
            "source_activity": "pattern_hunter"
        });
    }
    if ((signals.domain_exposure || 0) < 0.3 && (signals.top_cluster_confidence || 0) > 0.7) {
        flags.push({
            "type": "low_exposure",
            "note": "Top match has minimal domain exposure — recommend beginner resources",
            "source_activity": "career_simulation"
        });
    }
    const confidence_modifier = (signals.decisiveness || 0) > 0.6 ? 1.0 : 0.8;
    return { flags, confidence_modifier };
}
