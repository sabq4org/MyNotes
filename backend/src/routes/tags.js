'use strict';

const express = require('express');
const { getPool, query } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { getTagsForNotes } = require('../db/tagsHelper');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/tags
 * List all tags with their usage count, sorted by name.
 * Tags with zero notes are filtered out (kept clean).
 */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.name, COUNT(nt.note_id)::int AS note_count
       FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       GROUP BY t.id, t.name
       ORDER BY note_count DESC, LOWER(t.name) ASC`
    );
    res.json({
      tags: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        noteCount: Number(r.note_count),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tags/:id/notes
 * List all notes tagged with this tag, across projects.
 */
router.get('/:id/notes', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Tag id must be a number.' });
    }

    const tag = await query('SELECT id, name FROM tags WHERE id = $1', [id]);
    if (tag.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Tag not found.' });
    }

    const { rows } = await query(
      `SELECT n.*, p.name AS project_name, p.color AS project_color
       FROM notes n
       JOIN note_tags nt ON nt.note_id = n.id
       JOIN projects p ON p.id = n.project_id
       WHERE nt.tag_id = $1
       ORDER BY n.is_pinned DESC, n.updated_at DESC`,
      [id]
    );

    const ids = rows.map((r) => Number(r.id));
    const tagMap = await getTagsForNotes(getPool(), ids);

    res.json({
      tag: { id: Number(tag.rows[0].id), name: tag.rows[0].name },
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
