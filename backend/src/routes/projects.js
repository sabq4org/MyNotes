'use strict';

const express = require('express');
const { query } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

const MAX_NAME = 120;
const MAX_DESC = 1000;

function sanitizeText(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length > max) return null;
  return trimmed;
}

function rowToProject(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    position: row.position,
    notesCount: row.notes_count !== undefined ? Number(row.notes_count) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
              COALESCE(n.cnt, 0) AS notes_count
       FROM projects p
       LEFT JOIN (
         SELECT project_id, COUNT(*) AS cnt
         FROM notes
         GROUP BY project_id
       ) n ON n.project_id = p.id
       ORDER BY p.position ASC, p.created_at ASC`
    );
    res.json({ projects: rows.map(rowToProject) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body || {};

    const cleanName = sanitizeText(name, MAX_NAME);
    if (!cleanName) {
      return res.status(400).json({
        error: 'invalid_name',
        message: `Project name is required (1–${MAX_NAME} characters).`,
      });
    }

    const cleanDesc =
      description === undefined || description === null
        ? null
        : sanitizeText(description, MAX_DESC);
    if (cleanDesc === null && description !== undefined && description !== null) {
      return res.status(400).json({
        error: 'invalid_description',
        message: `Description must be at most ${MAX_DESC} characters.`,
      });
    }

    const positionRow = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM projects'
    );
    const nextPosition = positionRow.rows[0].next;

    const { rows } = await query(
      `INSERT INTO projects (name, description, color, icon, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        cleanName,
        cleanDesc || null,
        typeof color === 'string' && color.trim() ? color.trim() : null,
        typeof icon === 'string' && icon.trim() ? icon.trim() : null,
        nextPosition,
      ]
    );

    res.status(201).json({ project: rowToProject(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Project id must be a number.' });
    }

    const { rows } = await query(
      `SELECT p.*,
              COALESCE(n.cnt, 0) AS notes_count
       FROM projects p
       LEFT JOIN (
         SELECT project_id, COUNT(*) AS cnt
         FROM notes
         GROUP BY project_id
       ) n ON n.project_id = p.id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Project not found.' });
    }

    res.json({ project: rowToProject(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Project id must be a number.' });
    }

    const { name, description, color, icon } = req.body || {};
    const fields = [];
    const params = [];

    if (name !== undefined) {
      const cleanName = sanitizeText(name, MAX_NAME);
      if (!cleanName) {
        return res.status(400).json({
          error: 'invalid_name',
          message: `Project name must be 1–${MAX_NAME} characters.`,
        });
      }
      params.push(cleanName);
      fields.push(`name = $${params.length}`);
    }

    if (description !== undefined) {
      const cleanDesc =
        description === null ? null : sanitizeText(description, MAX_DESC);
      if (description !== null && cleanDesc === null) {
        return res.status(400).json({
          error: 'invalid_description',
          message: `Description must be at most ${MAX_DESC} characters.`,
        });
      }
      params.push(cleanDesc);
      fields.push(`description = $${params.length}`);
    }

    if (color !== undefined) {
      params.push(
        typeof color === 'string' && color.trim() ? color.trim() : null
      );
      fields.push(`color = $${params.length}`);
    }

    if (icon !== undefined) {
      params.push(
        typeof icon === 'string' && icon.trim() ? icon.trim() : null
      );
      fields.push(`icon = $${params.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        error: 'no_fields',
        message: 'No updatable fields provided.',
      });
    }

    params.push(id);
    const { rows } = await query(
      `UPDATE projects SET ${fields.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Project not found.' });
    }

    res.json({ project: rowToProject(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ error: 'invalid_id', message: 'Project id must be a number.' });
    }

    const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Project not found.' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
