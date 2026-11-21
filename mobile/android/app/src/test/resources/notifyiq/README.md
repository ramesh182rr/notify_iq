# Synthetic classification evaluation set

`notification-evaluation.tsv` contains 108 hand-authored synthetic examples: 12 per initial category across English, Hindi and code-mixed text. It includes ordinary examples, ambiguous wording, prompt-like text, explicit urgent phrases, and priority edge cases.

All messages were authored for this test set. The file contains no user, customer or copied notification content. It is a small deterministic-rule evaluation set, not a representative production corpus and not evidence of model quality. Its scores are a baseline for future rule changes; do not use them to claim language coverage or safety without broader review.

TSV columns are `id`, `language`, `text`, `category`, `priority`, and `phenomenon`. Categories and priorities follow the labels in the product specification. The evaluator reports category accuracy/macro-F1, priority accuracy, and urgent false positives/negatives without imposing a performance threshold.

Baseline with the deterministic analyzer: category accuracy `0.954`, macro-F1 `0.955`, priority accuracy `1.000`, urgent false positives `0`, urgent false negatives `0`. Category accuracy by language: English `1.000`, Hindi `0.944`, code-mixed `0.917`. These measurements are specific to this hand-authored corpus and must not be generalized to production traffic.
