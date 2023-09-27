-- Migration number: 0001 	 2023-09-24T15:15:06.176Z

CREATE TABLE IF NOT EXISTS "changeset_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "operations" text NOT NULL,
  "baseVersion" integer NOT NULL,
  "userId" integer NOT NULL,
  "memberId" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_1231629cf769a04bdb97e16ea6" ON "changeset_entity" ("codeId", "baseVersion");

CREATE TABLE IF NOT EXISTS "code_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "content" text NOT NULL,
  "title" varchar NOT NULL DEFAULT (''),
  "language" varchar NOT NULL DEFAULT ('typescript'),
  "metaVersion" integer NOT NULL DEFAULT (0),
  "version" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_da2da0cc763bd57e6ddd3700ea" ON "code_entity" ("codeId");

CREATE TABLE IF NOT EXISTS "snapshot_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "content" text NOT NULL,
  "version" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_daf719ba93cd2783e3f3c54a47" ON "snapshot_entity" ("codeId", "version");

CREATE TABLE IF NOT EXISTS "user_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" varchar NOT NULL,
  "avatar" varchar NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "room_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "members" text NOT NULL,
  "version" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8d17982ab3b1fde3401782dcb5" ON "room_entity" ("codeId");
