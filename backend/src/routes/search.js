'use strict';

const express = require('express');
const { getPool, query } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { getTagsForNotes } = require('../db/tagsHelper');

const router = express.Router();
router.use(requireAuth);

const MAX_RESULTS = 50;

/**
 * GET /api/search?q=...
 * Search across all notes by title / content text / tag name.
 * `q` can also start with `#` to limit to a tag (e.g. `#مهم`).
 */
router.get('/', async (req, res, next) => {
  try {
    const raw = (req.query.q || '').toString().trim();
    if (!raw || raw.length < 2) {
      return res.json({ query: raw, notes: [] });
    }

    const isTagOnly = raw.startsWith('#');
    const term = isTagOnly ? raw.slice(1).trim() : raw;
    if (!term) return res.json({ query: raw, notes: [] });

    const pattern = `%${term}%`;

    let sql;
    let params;
    if (isTagOnly) {
      sql = `
        SELECT DISTINCT n.*, p.name AS project_name, p.color AS project_color
        FROM notes n
        JOIN projects p ON p.id = n.project_id
        JOIN note_tags nt ON nt.note_id = n.id
        JOIN tags t ON t.id = nt.tag_id
        WHERE t.name ILIKE $1
        ORDER BY n.is_pinned DESC, n.updated_at DESC
        LIMIT $2
      `;
      params = [pattern, MAX_RESULTS];
    } else {
      sql = `
        SELECT DISTINCT n.*, p.name AS project_name, p.color AS project_color
        FROM notes n
        JOIN projects p ON p.id = n.project_id
        LEFT JOIN note_tags nt ON nt.note_id = n.id
        LEFT JOIN tags t ON t.id = nt.tag_id
        WHERE n.title ILIKE $1
           OR n.content ILIKE $1
           OR t.name ILIKE $1
        ORDER BY n.is_pinned DESC, n.updated_at DESC
        LIMIT $2
      `;
      params = [pattern, MAX_RESULTS];
    }

    const { rows } = await query(sql, params);
    const ids = rows.map((r) => Number(r.id));
    const tagMap = await getTagsForNotes(getPool(), ids);

    res.json({
      query: raw,
      notes: rows.map((r) => ({
        id: Number(r.id),
        projectId: Number(r.project_id),
        projectName: r.project_name,
        projectColor: r.project_color,
        title: r.title,
        content: r.content,
        isPinned: Boolean(r.is_pinned),
        tags: tagMap.get(Number(r.id)) || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
