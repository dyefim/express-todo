process.loadEnvFile();

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
const up = (pgm) => {
  pgm.renameTable("todo_list", "tasks");
  pgm.renameTable("todo_categories", "categories");
  pgm.renameColumn("todo_item_categories", "todo_id", "task_id"); // rename column before renaming table
  pgm.renameTable("todo_item_categories", "task_categories");
};

module.exports = {
  up,
};
