-- Feedback thumbs on Khlayel assistant messages (eval dataset)
ALTER TABLE ai_messages
  ADD COLUMN feedback ENUM('up', 'down') NULL DEFAULT NULL AFTER graph_spec;
