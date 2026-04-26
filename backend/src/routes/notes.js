'use strict';

const express = require('express');
const { getPool, query } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const {
  sanitizeTagList,
  syncNoteTags,
  getTagsForNote,
  getTagsForNotes,
} = require('../db/tagsHelper');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const MAX_TITLE = 200;
const MAX_CONTENT = 200_000;

function rowToNote(row, tags = []) {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    title: row.title,
    content: row.content,
    isPinned: Boolean(row.is_pinned),
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function projectExists(projectId) {
  const { rows } = await query('SELECT 1 FROM projects WHERE id = $1', [
    projectId,
  ]);
  return rows.length > 0;
}

function tagValidationResponse(res, err) {
  if (err && err.code === 'invalid_tags') {
    return res
      .status(400)
      .json({ error: 'invalid_tags', message: 'الوسوم يجب أن تكون مصفوفة.' });
  }
  if (err && err.code === 'invalid_tag') {
    return res
      .status(400)
      .json({ error: 'invalid_tag', message: 'وسم غير صالح.' });
  }
  if (err && err.code === 'too_many_tags') {
    return res
      .status(400)
      .json({ error: 'too_many_tags', message: 'عدد الوسوم تجاوز الحدّ.' });
  }
  return null;
}

/* ─────────────────────────────────────────────
 * Notes scoped under a project.
 * Mounted at /api/projects/:projectId/notes.
 * ───────────────────────────────────────────── */

router.get('/', async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Project id must be a number.',
      });
    }
    if (!(await projectExists(projectId))) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Project not found.' });
    }

    const { rows } = await query(
      `SELECT * FROM notes
       WHERE project_id = $1
       ORDER BY is_pinned DESC, updated_at DESC`,
      [projectId]
    );
    const ids = rows.map((r) => Number(r.id));
    const tagMap = await getTagsForNotes(getPool(), ids);
    res.json({
      notes: rows.map((r) => rowToNote(r, tagMap.get(Number(r.id)) || [])),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({
        error: 'invalid_id',
        message: 'Project id must be a number.',
      });
    }
    if (!(await projectExists(projectId))) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Project not found.' });
    }

    const {
      title = '',
      content = '',
      isPinned = false,
      tags,
    } = req.body || {};

    if (typeof title !== 'string' || title.length > MAX_TITLE) {
      return res.status(400).json({
        error: 'invalid_title',
        message: `Title must be at most ${MAX_TITLE} characters.`,
      });
    }
    if (typeof content !== 'string' || content.length > MAX_CONTENT) {
      return res
        .status(400)
        .json({ error: 'invalid_content', message: 'Content is too long.' });
    }

    let tagNames = null;
    try {
      tagNames = sanitizeTagList(tags);
    } catch (err) {
      const r = tagValidationResponse(res, err);
      if (r) return r;
      throw err;
    }

    const { rows } = await query(
      `INSERT INTO notes (project_id, title, content, is_pinned)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, title, content, Boolean(isPinned)]
    );
    const note = rows[0];

    let attachedTags = [];
    if (tagNames !== null) {
      attachedTags = (await syncNoteTags(getPool(), note.id, tagNames)).map(
        (name, i) => ({ id: i, name })
      );
      // Re-fetch with proper IDs.
      attachedTags = await getTagsForNote(getPool(), note.id);
    }

    res.status(201).json({ note: rowToNote(note, attachedTags) });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────
 * Standalone note endpoints, mounted at /api/notes.
 * ───────────────────────────────────────────── */

const noteRouter = express.Router();
noteRouter.use(requireAuth);

noteRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Note id must be a number.' });
    }
    const { rows } = await query('SELECT * FROM notes WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Note not found.' });
    }
    const tags = await getTagsForNote(getPool(), id);
    res.json({ note: rowToNote(rows[0], tags) });
  } catch (err) {
    next(err);
  }
});

noteRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Note id must be a number.' });
    }

    const { title, content, isPinned, tags } = req.body || {};

    const fields = [];
    const params = [];

    if (title !== undefined) {
      if (typeof title !== 'string' || title.length > MAX_TITLE) {
        return res.status(400).json({
          error: 'invalid_title',
          message: `Title must be at most ${MAX_TITLE} characters.`,
        });
      }
      params.push(title);
      fields.push(`title = $${params.length}`);
    }
    if (content !== undefined) {
      if (typeof content !== 'string' || content.length > MAX_CONTENT) {
        return res
          .status(400)
          .json({ error: 'invalid_content', message: 'Content is too long.' });
      }
      params.push(content);
      fields.push(`content = $${params.length}`);
    }
    if (isPinned !== undefined) {
      params.push(Boolean(isPinned));
      fields.push(`is_pinned = $${params.length}`);
    }

    let tagNames = null;
    if (tags !== undefined) {
      try {
        tagNames = sanitizeTagList(tags);
      } catch (err) {
        const r = tagValidationResponse(res, err);
        if (r) return r;
        throw err;
      }
    }

    if (fields.length === 0 && tagNames === null) {
      return res
        .status(400)
        .json({ error: 'no_fields', message: 'No updatable fields provided.' });
    }

    let row;
    if (fields.length > 0) {
      params.push(id);
      const { rows } = await query(
        `UPDATE notes SET ${fields.join(', ')}
         WHERE id = $${params.length}
         RETURNING *`,
        params
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'not_found', message: 'Note not found.' });
      }
      row = rows[0];
    } else {
      // Only tags being updated — keep timestamps fresh.
      const { rows } = await query(
        `UPDATE notes SET updated_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'not_found', message: 'Note not found.' });
      }
      row = rows[0];
    }

    if (tagNames !== null) {
      await syncNoteTags(getPool(), id, tagNames);
    }
    const finalTags = await getTagsForNote(getPool(), id);
    res.json({ note: rowToNote(row, finalTags) });
  } catch (err) {
    next(err);
  }
});

noteRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Note id must be a number.' });
    }
    const { rowCount } = await query('DELETE FROM notes WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Note not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  projectNotesRouter: router,
  noteRouter,
};
