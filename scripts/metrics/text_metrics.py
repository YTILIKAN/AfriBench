"""Stubs de métriques pour tâches non-QCM (pas de deps lourdes).

Usage CI / dry-run — remplacer plus tard par sacrebleu / rouge / bert-score.
"""

from __future__ import annotations

import re
from collections import Counter


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", (text or "").lower(), flags=re.UNICODE)


def token_f1(pred: str, ref: str) -> float:
    p, r = _tokenize(pred), _tokenize(ref)
    if not p and not r:
        return 1.0
    if not p or not r:
        return 0.0
    pc, rc = Counter(p), Counter(r)
    overlap = sum((pc & rc).values())
    if overlap == 0:
        return 0.0
    precision = overlap / len(p)
    recall = overlap / len(r)
    return 2 * precision * recall / (precision + recall)


def rouge_l_proxy(pred: str, ref: str) -> float:
    """Proxy léger type ROUGE-L via LCS sur tokens (pas le package rouge)."""
    p, r = _tokenize(pred), _tokenize(ref)
    if not p or not r:
        return 0.0
    # LCS length
    dp = [[0] * (len(r) + 1) for _ in range(len(p) + 1)]
    for i in range(1, len(p) + 1):
        for j in range(1, len(r) + 1):
            if p[i - 1] == r[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    lcs = dp[-1][-1]
    precision = lcs / len(p)
    recall = lcs / len(r)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def bleu_proxy(pred: str, ref: str) -> float:
    """Unigram precision proxy (pas sacrebleu)."""
    p, r = _tokenize(pred), _tokenize(ref)
    if not p or not r:
        return 0.0
    rc = Counter(r)
    hit = 0
    for t in p:
        if rc[t] > 0:
            hit += 1
            rc[t] -= 1
    return hit / len(p)


def entity_f1(pred: list[dict], gold: list[dict]) -> float:
    """F1 exact match sur (span lower, label)."""
    def key(e: dict) -> tuple[str, str]:
        return ((e.get("span") or "").strip().lower(), (e.get("label") or "").upper())

    ps, gs = {key(e) for e in pred}, {key(e) for e in gold}
    if not ps and not gs:
        return 1.0
    if not ps or not gs:
        return 0.0
    tp = len(ps & gs)
    precision = tp / len(ps)
    recall = tp / len(gs)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)
