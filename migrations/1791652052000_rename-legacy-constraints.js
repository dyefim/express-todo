// Idempotent: DBs created from scripts/init.sql already use the new names.
const constraints = [
  ["tasks", "todo_list_pkey", "tasks_pkey"],
  ["tasks", "todo_list_created_by_fkey", "tasks_created_by_fkey"],
  ["categories", "todo_categories_pkey", "categories_pkey"],
  ["categories", "todo_categories_name_key", "categories_name_key"],
  [
    "categories",
    "todo_categories_created_by_fkey",
    "categories_created_by_fkey",
  ],
  ["task_categories", "todo_item_categories_pkey", "task_categories_pkey"],
  [
    "task_categories",
    "todo_item_categories_category_id_fkey",
    "task_categories_category_id_fkey",
  ],
  [
    "task_categories",
    "todo_item_categories_todo_id_fkey",
    "task_categories_task_id_fkey",
  ],
];

const sequences = [
  ["todo_list_id_seq", "tasks_id_seq"],
  ["todo_categories_id_seq", "categories_id_seq"],
  ["todo_item_categories_id_seq", "task_categories_id_seq"],
];

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
const up = (pgm) => {
  for (const [table, from, to] of constraints) {
    pgm.sql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = '${table}'::regclass AND conname = '${from}'
        ) THEN
          ALTER TABLE ${table} RENAME CONSTRAINT ${from} TO ${to};
        END IF;
      END $$;
    `);
  }

  for (const [from, to] of sequences) {
    pgm.sql(`ALTER SEQUENCE IF EXISTS ${from} RENAME TO ${to};`);
  }

  // PG 18 NOT NULL constraints keep the creation-time table name (todo_list_title_not_null).
  pgm.sql(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT c.conrelid::regclass::text AS tbl, c.conname, a.attname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'n' AND c.conname LIKE 'todo\\_%'
      LOOP
        EXECUTE format(
          'ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
          r.tbl, r.conname, r.tbl || '_' || r.attname || '_not_null'
        );
      END LOOP;
    END $$;
  `);
};

module.exports = {
  up,
};
