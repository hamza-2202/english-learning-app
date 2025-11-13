// utils/sanitizer.js
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a window for DOMPurify in Node
const { window } = new JSDOM('');
const purify = DOMPurify(window);

const sanitizeContent = (dirtyHtml) => {
  return purify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'strike', 'sub', 'sup', 'h1', 'h2',
      'code', 'pre', 'q', 'blockquote', 'ul', 'ol', 'li', 'span', 'table', 'th', 'tr', 'td'
    ],
    // ALLOWED_ATTR: ['href', 'title'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onload']
  })
}

const sanitizeAll = (dirtyHtml) => {
  return purify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}

export {
  sanitizeContent,
  sanitizeAll
}