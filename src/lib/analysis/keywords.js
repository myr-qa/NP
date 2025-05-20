/**
 * Finds keywords in a commit message, case-insensitively.
 *
 * @param {string} message - The commit message string.
 * @param {string[]} keywords - An array of keywords to search for.
 * @returns {string[]} An array of original-case keywords found in the message.
 */
function findKeywordsInMessage(message, keywords) {
  if (!message || typeof message !== 'string' || !Array.isArray(keywords)) {
    return [];
  }

  const lowerCaseMessage = message.toLowerCase();
  const foundKeywords = [];

  for (const keyword of keywords) {
    if (typeof keyword === 'string' && keyword.trim() !== '') {
      const lowerCaseKeyword = keyword.trim().toLowerCase();
      if (lowerCaseMessage.includes(lowerCaseKeyword)) {
        foundKeywords.push(keyword); // Store the original-case keyword
      }
    }
  }

  return foundKeywords;
}

module.exports = {
  findKeywordsInMessage,
};

