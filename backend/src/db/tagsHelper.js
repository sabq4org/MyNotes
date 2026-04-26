'use strict';

/**
 * Tag helpers shared by notes, tags and search routes.
 *
 * Tags are case-insensitive (a unique index on LOWER(name) enforces it).
 * The first-seen casing is preserved as the canonical display name.
 */

const MAX_TAG = 60;
const MAX_TAGS_PER_NOTE = 30;

function normalizeTagName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length > MAX_TAG) return null;
  return trimmed;
}

/**
 * Normalize and de-dupe an array of tag names (case-insensitively).
 * Returns null if the input is not an array. Throws on invalid entries.
 */
function sanitizeTagList(input) {
  if (input === undefined || input === null) return null;
  if (!Array.isArray(input)) {
    const err = new Error('tags must be an array of strings');
    err.code = 'invalid_tags';
    throw err;
  }
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const name = normalizeTagName(raw);
    if (!name) {
      const err = new Error(`invalid tag value: ${JSON.stringify(raw)}`);
      err.code = 'invalid_tag';
      throw err;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length > MAX_TAGS_PER_NOTE) {
      const err = new Error(`too many tags (max ${MAX_TAGS_PER_NOTE})`);
      err.code = 'too_many_tags';
      throw err;
    }
  }
  return out;
}

/**
 * Insert tag if missing (case-insensitive lookup), return its id.
 * Uses the provided pg client (so it can run inside a transaction).
 */
async function upsertTag(client, name) {
  const existing = await client.query(
    'SELECT id, name FROM tags WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [name]
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const inserted = await client.query(
    'INSERT INTO tags (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return inserted.rows[0];
}

/**
 * Replace the tag list for a note. Atomic via a transaction.
 * Returns the canonical list of tag names attached to the note.
 */
async function syncNoteTags(pool, noteId, names) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
    const finalNames = [];
    for (const name of names) {
      const tag = await upsertTag(client, name);
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [noteId, tag.id]
      );
      finalNames.push(tag.name);
    }
    await client.query('COMMIT');
    return finalNames;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetch tags for a single note id.
 */
async function getTagsForNote(pool, noteId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.name
     FROM tags t
     JOIN note_tags nt ON nt.tag_id = t.id
     WHERE nt.note_id = $1
     ORDER BY LOWER(t.name) ASC`,
    [noteId]
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.name }));
}

/**
 * Fetch tags for many note ids in a single query, returning a Map
 * `noteId -> tag[]` so callers can join cheaply.
 */
async function getTagsForNotes(pool, noteIds) {
  if (!noteIds || noteIds.length === 0) return new Map();
  const { rows } = await pool.query(
    `SELECT nt.note_id, t.id, t.name
     FROM note_tags nt
     JOIN tags t ON t.id = nt.tag_id
     WHERE nt.note_id = ANY($1::bigint[])
     ORDER BY LOWER(t.name) ASC`,
    [noteIds]
  );
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.note_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ id: Number(row.id), name: row.name });
  }
  return map;
}

module.exports = {
  MAX_TAG,
  MAX_TAGS_PER_NOTE,
  normalizeTagName,
  sanitizeTagList,
  upsertTag,
  syncNoteTags,
  getTagsForNote,
  getTagsForNotes,
};
