import type Database from '../sqlite/sync-database'
import type { BotGroup } from '../../shared/bots/bot-group'

// The group store's tables, and what keeps their records whole across builds.

/**
 * Fields an older build drops when it writes a record back, since its schema strips keys it
 * doesn't know: a rollback, then an edit, a new thread or a turn update, would lose the paired
 * roster, the remote answers and the image refs. The database keeps them, so the trigger runs in
 * whichever build writes. A build that knows a field clears it by writing an empty list.
 */
const KEPT_FIELDS = [
  ['bot_groups', 'remoteMembers'],
  ['bot_group_messages', 'images'],
  ['bot_group_messages', 'remoteAsks']
] as const

function keepFieldTrigger(table: string, field: string): string {
  const path = `'$.${field}'`
  return `CREATE TRIGGER IF NOT EXISTS ${table}_keep_${field} AFTER UPDATE OF record ON ${table}
    WHEN json_type(NEW.record, ${path}) IS NULL AND json_type(OLD.record, ${path}) IS NOT NULL
    BEGIN
      UPDATE ${table} SET record = json_set(record, ${path}, OLD.record -> ${path}) WHERE rowid = NEW.rowid;
    END;`
}

/** `put` stores no remote members as an empty list; it reads as none. */
export function withoutClearedRoster(group: BotGroup): BotGroup {
  if (group.remoteMembers?.length !== 0) {
    return group
  }
  const { remoteMembers: _cleared, ...rest } = group
  return rest
}

export function createBotGroupTables(db: Database): void {
  const asksIndexed = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'bot_group_remote_asks'")
    .get()
  db.exec(`CREATE TABLE IF NOT EXISTS bot_groups (id TEXT PRIMARY KEY, record TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bot_group_messages (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
      group_id TEXT NOT NULL, record TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bot_group_operations (operation_id TEXT PRIMARY KEY, message_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bot_group_pending (operation_id TEXT PRIMARY KEY, group_id TEXT NOT NULL, context TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bot_group_worker_operations (dispatch_id TEXT PRIMARY KEY, operation_id TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS bot_group_worker_operation ON bot_group_worker_operations(operation_id);
    CREATE INDEX IF NOT EXISTS bot_group_messages_room ON bot_group_messages(group_id, sequence);
    -- Same expression as roomMessages, so a room page reads only its own thread's rows; any build's writes keep it current.
    CREATE INDEX IF NOT EXISTS bot_group_messages_thread
      ON bot_group_messages(group_id, coalesce(json_extract(record, '$.threadId'), ''), sequence);
    CREATE TABLE IF NOT EXISTS bot_group_sidebar (group_id TEXT PRIMARY KEY, sidebar_order INTEGER, latest TEXT);
    -- The post each remote question went with, so its answer's mail finds it without reading rooms.
    CREATE TABLE IF NOT EXISTS bot_group_remote_asks (request_id TEXT PRIMARY KEY, message_id TEXT NOT NULL);`)
  if (!asksIndexed) {
    // Once, for questions a build asked before it kept this table.
    db.exec(`INSERT OR IGNORE INTO bot_group_remote_asks(request_id, message_id)
      SELECT json_extract(ask.value, '$.requestId'), m.id
      FROM bot_group_messages m, json_each(m.record, '$.remoteAsks') ask
      WHERE json_type(m.record, '$.remoteAsks') = 'array'
        AND json_type(ask.value, '$.requestId') = 'text';`)
  }
  for (const [table, field] of KEPT_FIELDS) {
    db.exec(keepFieldTrigger(table, field))
  }
}
