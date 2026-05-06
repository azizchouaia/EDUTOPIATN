const { validationResult } = require('express-validator');

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }

  const formattedErrors = errors.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  res.status(422).json({
    message: formattedErrors[0]?.message || 'Les donnees envoyees sont invalides.',
    errors: formattedErrors,
  });

  return true;
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || '').trim());
}

function isHexColor(value) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value || '').trim());
}

function isHttpUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return false;
  }

  try {
    const parsed = new URL(rawValue);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isFutureDate(value) {
  const timestamp = Date.parse(String(value || ''));
  return !Number.isNaN(timestamp) && timestamp > Date.now();
}

module.exports = {
  handleValidationErrors,
  isSlug,
  isHexColor,
  isHttpUrl,
  isFutureDate,
};