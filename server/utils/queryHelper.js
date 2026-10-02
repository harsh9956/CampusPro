const mongoose = require('mongoose');

/**
 * Escapes regex special characters to prevent ReDoS and regex injection attacks
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Truncates and sanitizes search strings to safe bounded length
 * @param {string} str
 * @param {number} [maxLength=100]
 * @returns {string}
 */
const cleanSearchString = (str, maxLength = 100) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
};

/**
 * Safely generates case-insensitive RegExp from user input
 * @param {string} str
 * @param {string} [flags='i']
 * @param {number} [maxLength=100]
 * @returns {RegExp|null}
 */
const safeRegex = (str, flags = 'i', maxLength = 100) => {
  const cleaned = cleanSearchString(str, maxLength);
  if (!cleaned) return null;
  return new RegExp(escapeRegex(cleaned), flags);
};

/**
 * Validates strictly whether an input is a valid 24-character hexadecimal MongoDB ObjectId
 * @param {any} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  const strId = String(id);
  return (
    mongoose.Types.ObjectId.isValid(strId) &&
    String(new mongoose.Types.ObjectId(strId)) === strId
  );
};

module.exports = {
  escapeRegex,
  cleanSearchString,
  safeRegex,
  isValidObjectId
};
