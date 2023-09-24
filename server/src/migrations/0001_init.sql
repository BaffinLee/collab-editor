-- Migration number: 0001 	 2023-09-24T15:15:06.176Z

CREATE TABLE "changeset_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "operations" text NOT NULL,
  "baseVersion" integer NOT NULL,
  "userId" integer NOT NULL,
  "memberId" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
)

CREATE UNIQUE INDEX "IDX_1231629cf769a04bdb97e16ea6" ON "changeset_entity" ("codeId", "baseVersion")

CREATE TABLE "code_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "content" text NOT NULL,
  "title" varchar NOT NULL DEFAULT (''),
  "language" varchar NOT NULL DEFAULT ('typescript'),
  "metaVersion" integer NOT NULL DEFAULT (0),
  "version" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
)

CREATE UNIQUE INDEX "IDX_da2da0cc763bd57e6ddd3700ea" ON "code_entity" ("codeId")

CREATE TABLE "snapshot_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "codeId" varchar NOT NULL,
  "content" text NOT NULL,
  "version" integer NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
)

CREATE UNIQUE INDEX "IDX_daf719ba93cd2783e3f3c54a47" ON "snapshot_entity" ("codeId", "version")

CREATE TABLE "user_entity" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" varchar NOT NULL,
  "avatar" varchar NOT NULL,
  "updateTime" date NOT NULL DEFAULT (datetime('now')),
  "createTime" date NOT NULL DEFAULT (datetime('now'))
)
