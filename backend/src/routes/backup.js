'use strict';

const express = require('express');
const { getPool, query } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

const BACKUP_VERSION = 1;

/**
 * GET /api/backup/export
 * Returns the entire user data set as a downloadable JSON file.
 * Excludes auth-related secrets (PIN hash, JWT secret).
 */
router.get('/export', async (req, res, next) => {
  try {
    const [projects, notes, tags, noteTags] = await Promise.all([
      query(`SELECT * FROM projects ORDER BY id ASC`),
      query(`SELECT * FROM notes ORDER BY id ASC`),
      query(`SELECT * FROM tags ORDER BY id ASC`),
      query(`SELECT * FROM note_tags ORDER BY note_id ASC, tag_id ASC`),
    ]);

    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {
        projects: projects.rows.length,
        notes: notes.rows.length,
        tags: tags.rows.length,
        noteTags: noteTags.rows.length,
      },
      projects: projects.rows.map((p) => ({
        id: Number(p.id),
        name: p.name,
        description: p.description,
        color: p.color,
        icon: p.icon,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      notes: notes.rows.map((n) => ({
        id: Number(n.id),
        projectId: Number(n.project_id),
        title: n.title,
        content: n.content,
        isPinned: Boolean(n.is_pinned),
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })),
      tags: tags.rows.map((t) => ({
        id: Number(t.id),
        name: t.name,
        createdAt: t.created_at,
      })),
      noteTags: noteTags.rows.map((nt) => ({
        noteId: Number(nt.note_id),
        tagId: Number(nt.tag_id),
      })),
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `mynotes-backup-${stamp}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/backup/import
 * Restores from a previously exported JSON file.
 * Mode: REPLACE — wipes all projects/notes/tags/note_tags then re-inserts.
 * Auth secrets (master_pin_hash, jwt_secret) are NEVER touched.
 *
 * Body: the parsed JSON payload (same shape produced by /export).
 */
router.post('/import', async (req, res, next) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const data = req.body || {};
    if (!data || typeof data !== 'object') {
      return res
        .status(400)
        .json({ error: 'invalid_payload', message: 'Invalid JSON body.' });
    }
    if (data.version !== BACKUP_VERSION) {
      return res.status(400).json({
        error: 'unsupported_version',
        message: `Unsupported backup version: ${data.version}.`,
      });
    }

    const projects = Array.isArray(data.projects) ? data.projects : [];
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const noteTags = Array.isArray(data.noteTags) ? data.noteTags : [];

    await client.query('BEGIN');

    // Wipe in dependency order. ON DELETE CASCADE handles note_tags + notes
    // when projects are dropped, but we want a fully predictable restore so
    // we delete each table explicitly.
    await client.query('DELETE FROM note_tags');
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM projects');
    await client.query('DELETE FROM tags');

    // Restart sequences so newly imported ids stay stable.
    await client.query(
      `SELECT setval(pg_get_serial_sequence('projects', 'id'), 1, false)`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('notes', 'id'), 1, false)`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('tags', 'id'), 1, false)`
    );

    let maxProjectId = 0;
    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (id, name, description, color, icon, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))`,
        [
          Number(p.id),
          String(p.name || ''),
          p.description ?? null,
          p.color ?? null,
          p.icon ?? null,
          p.createdAt ?? null,
          p.updatedAt ?? null,
        ]
      );
      if (Number(p.id) > maxProjectId) maxProjectId = Number(p.id);
    }
    if (maxProjectId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('projects', 'id'), $1, true)`,
        [maxProjectId]
      );
    }

    let maxNoteId = 0;
    for (const n of notes) {
      await client.query(
        `INSERT INTO notes (id, project_id, title, content, is_pinned, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))`,
        [
          Number(n.id),
          Number(n.projectId),
          String(n.title || ''),
          String(n.content || ''),
          Boolean(n.isPinned),
          n.createdAt ?? null,
          n.updatedAt ?? null,
        ]
      );
      if (Number(n.id) > maxNoteId) maxNoteId = Number(n.id);
    }
    if (maxNoteId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('notes', 'id'), $1, true)`,
        [maxNoteId]
      );
    }

    let maxTagId = 0;
    for (const t of tags) {
      await client.query(
        `INSERT INTO tags (id, name, created_at)
         VALUES ($1, $2, COALESCE($3::timestamptz, now()))
         ON CONFLICT DO NOTHING`,
        [Number(t.id), String(t.name || ''), t.createdAt ?? null]
      );
      if (Number(t.id) > maxTagId) maxTagId = Number(t.id);
    }
    if (maxTagId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('tags', 'id'), $1, true)`,
        [maxTagId]
      );
    }

    for (const nt of noteTags) {
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [Number(nt.noteId), Number(nt.tagId)]
      );
    }

    await client.query('COMMIT');
    res.json({
      ok: true,
      restored: {
        projects: projects.length,
        notes: notes.length,
        tags: tags.length,
        noteTags: noteTags.length,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
