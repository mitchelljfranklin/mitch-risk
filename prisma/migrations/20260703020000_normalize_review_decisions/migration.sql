-- The per-answer "Reject" review decision was removed in favour of
-- "Request clarification". Normalise any historical rows so they no longer
-- block finalization without a matching review option in the UI.
UPDATE "answer_reviews"
SET "decision" = 'CLARIFICATION_REQUESTED'
WHERE "decision" = 'REJECTED';
