# app

Electron app, initialized with [electron-vite](https://electron-vite.org/)

## Optional Turso Sync

The desktop app always keeps a local SQLite database file. You can optionally
configure a Turso remote database in the app settings to enable embedded replica
sync on startup.

### Desktop settings

Open `Settings -> Database Sync` and set:

- `Turso database URL`
- `Turso auth token`

### Important limitation

This enables libsql/Turso embedded replica sync. It does **not** automatically
merge an arbitrary existing local SQLite database into a brand-new Turso
database.

Saving either value restarts the desktop app database connection immediately:

- if both values are present, the desktop app uses Turso embedded replica sync
- if only one value or neither is present, the desktop app falls back to
  local-only SQLite

Safe usage patterns:

1. Start from a Turso database that already contains the same schema/data lineage
2. Or seed Turso first from your existing local database, then point the desktop
   app at that Turso database

If only one of the two values is set, the desktop app ignores the sync config
and continues using local-only SQLite.
