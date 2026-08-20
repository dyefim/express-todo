CREATE TABLE IF NOT EXISTS todo_list (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    done BOOLEAN DEFAULT false
);

INSERT INTO todo_list (title, done) 
VALUES ('Setup Docker + PostgreSQL', true)
ON CONFLICT DO NOTHING;
