-- Token usage tracking on Khlayel assistant messages (admin dashboard)
ALTER TABLE ai_messages
  ADD COLUMN model VARCHAR(64) NULL DEFAULT NULL AFTER graph_spec,
  ADD COLUMN prompt_tokens INT NULL DEFAULT NULL AFTER model,
  ADD COLUMN completion_tokens INT NULL DEFAULT NULL AFTER prompt_tokens;
