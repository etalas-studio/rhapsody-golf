/**
 * Thin Anthropic client using native fetch.
 * The @anthropic-ai/sdk adds x-stainless-* and user-agent headers that 9router blocks.
 * Exposes the same .messages.create() interface the rest of the codebase uses.
 */
const config = require('./index');

const BASE_URL = config.anthropic.baseUrl ?? 'https://api.anthropic.com/v1';
const API_KEY = config.anthropic.apiKey;

async function messagesCreate(params) {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(params),
  });

  let text = await res.text();

  if (!res.ok) {
    const err = new Error(`${res.status} ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  // 9router returns text/event-stream and appends "data: [DONE]" after the JSON body
  if (text.includes('data: [DONE]')) {
    text = text.split('data: [DONE]')[0].trimEnd();
  }

  return JSON.parse(text);
}

module.exports = {
  messages: { create: messagesCreate },
};
