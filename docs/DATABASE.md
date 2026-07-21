\-- Table: tasks

CREATE TABLE IF NOT EXISTS tasks (

&#x20;   id VARCHAR(36) PRIMARY KEY,

&#x20;   task\_date DATE NOT NULL,

&#x20;   time\_slot VARCHAR(20),

&#x20;   exact\_time TIME,

&#x20;   content TEXT NOT NULL,

&#x20;   is\_important TINYINT(1) DEFAULT 0,

&#x20;   is\_completed TINYINT(1) DEFAULT 0,

&#x20;   created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP

);



CREATE INDEX IF NOT EXISTS idx\_task\_date ON tasks(task\_date);

CREATE INDEX IF NOT EXISTS idx\_important ON tasks(task\_date, is\_important);



\-- Table: app\_settings

CREATE TABLE IF NOT EXISTS app\_settings (

&#x20;   key VARCHAR(50) PRIMARY KEY,

&#x20;   value TEXT NOT NULL,

&#x20;   updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP

);

