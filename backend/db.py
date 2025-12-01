import sqlite3
from datetime import datetime

DB_NAME = "jobs.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            external_id TEXT NOT NULL,
            title TEXT,
            url TEXT,
            budget TEXT,
            description TEXT,
            posted_at TEXT,
            created_at TEXT,
            UNIQUE(platform, external_id)
        )
    ''')
    
    # OPTIMIZATION: Add indexes for faster queries
    c.execute('CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title)')
    
    conn.commit()
    conn.close()

def is_job_exists(platform, external_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT 1 FROM jobs WHERE platform = ? AND external_id = ?', (platform, external_id))
    exists = c.fetchone() is not None
    conn.close()
    return exists

def insert_job(job):
    if is_job_exists(job['platform'], job['external_id']):
        return False
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''
            INSERT INTO jobs (platform, external_id, title, url, budget, description, posted_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job['platform'],
            job['external_id'],
            job['title'],
            job['url'],
            job['budget'],
            job.get('description', ''),
            job.get('posted_at', datetime.now().isoformat()),
            datetime.now().isoformat()
        ))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_jobs(query=None, limit=50, offset=0):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    sql = 'SELECT * FROM jobs'
    params = []
    
    if query:
        # Split query into keywords and match any of them in title or description
        keywords = [word.strip() for word in query.split() if len(word.strip()) > 2]
        
        if keywords:
            conditions = []
            for word in keywords:
                conditions.append("(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)")
                params.extend([f'%{word.lower()}%', f'%{word.lower()}%'])
            
            sql += ' WHERE ' + ' OR '.join(conditions)
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.append(limit)
    params.append(offset)
    
    c.execute(sql, params)
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
