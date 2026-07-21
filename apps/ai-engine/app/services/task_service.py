import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.database import get_db_connection

logger = logging.getLogger(__name__)

def add_tasks(tasks_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Insert new tasks into SQLite database.
    """
    if not tasks_data:
        return []

    created_tasks = []
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for item in tasks_data:
            task_id = str(uuid.uuid4())
            task_date = item.get("task_date") or datetime.now().strftime("%Y-%m-%d")
            time_slot = item.get("time_slot")
            exact_time = item.get("exact_time")
            start_time = item.get("start_time")
            end_time = item.get("end_time")
            note = item.get("note")
            content = item.get("content", "").strip()
            is_important = 1 if item.get("is_important") else 0

            if not content:
                continue

            cursor.execute("""
                INSERT INTO tasks (id, task_date, time_slot, exact_time, start_time, end_time, content, note, is_important, is_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (task_id, task_date, time_slot, exact_time, start_time, end_time, content, note, is_important))

            created_tasks.append({
                "id": task_id,
                "task_date": task_date,
                "time_slot": time_slot,
                "exact_time": exact_time,
                "start_time": start_time,
                "end_time": end_time,
                "content": content,
                "note": note,
                "is_important": bool(is_important),
                "is_completed": False
            })

        conn.commit()
        logger.info(f"Successfully saved {len(created_tasks)} tasks to database.")
        return created_tasks

    except Exception as e:
        conn.rollback()
        logger.error(f"Error inserting tasks to database: {e}", exc_info=True)
        return []
    finally:
        conn.close()

def get_tasks_by_date(task_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve tasks for a specific date (defaults to today).
    """
    target_date = task_date or datetime.now().strftime("%Y-%m-%d")
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, task_date, time_slot, exact_time, start_time, end_time, content, note, is_important, is_completed, created_at
            FROM tasks
            WHERE task_date = ?
            ORDER BY exact_time ASC, start_time ASC, created_at ASC
        """, (target_date,))

        rows = cursor.fetchall()
        tasks = []
        for row in rows:
            tasks.append({
                "id": row["id"],
                "task_date": row["task_date"],
                "time_slot": row["time_slot"],
                "exact_time": row["exact_time"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "content": row["content"],
                "note": row["note"],
                "is_important": bool(row["is_important"]),
                "is_completed": bool(row["is_completed"]),
                "created_at": str(row["created_at"])
            })
        return tasks

    except Exception as e:
        logger.error(f"Error querying tasks from database: {e}", exc_info=True)
        return []
    finally:
        conn.close()

def get_all_tasks() -> List[Dict[str, Any]]:
    """
    Retrieve all tasks in the database to populate the calendar grid.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, task_date, time_slot, exact_time, start_time, end_time, content, note, is_important, is_completed, created_at
            FROM tasks
            ORDER BY task_date ASC, exact_time ASC, start_time ASC, created_at ASC
        """)

        rows = cursor.fetchall()
        tasks = []
        for row in rows:
            tasks.append({
                "id": row["id"],
                "task_date": row["task_date"],
                "time_slot": row["time_slot"],
                "exact_time": row["exact_time"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "content": row["content"],
                "note": row["note"],
                "is_important": bool(row["is_important"]),
                "is_completed": bool(row["is_completed"]),
                "created_at": str(row["created_at"])
            })
        return tasks

    except Exception as e:
        logger.error(f"Error querying all tasks from database: {e}", exc_info=True)
        return []
    finally:
        conn.close()

def update_task(task_id: str, updates: Dict[str, Any]) -> bool:
    """
    Update an existing task dynamically.
    """
    if not updates:
        return False
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        set_clauses = []
        values = []
        for key, val in updates.items():
            if key in ['task_date', 'time_slot', 'exact_time', 'start_time', 'end_time', 'content', 'note', 'is_important', 'is_completed']:
                set_clauses.append(f"{key} = ?")
                # Handle booleans for sqlite
                if isinstance(val, bool):
                    values.append(1 if val else 0)
                else:
                    values.append(val)
                    
        if not set_clauses:
            return False
            
        values.append(task_id)
        query = f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, tuple(values))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating task {task_id}: {e}", exc_info=True)
        return False
    finally:
        conn.close()

def delete_task(task_id: str) -> bool:
    """
    Delete a task from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting task {task_id}: {e}", exc_info=True)
        return False
    finally:
        conn.close()

def search_tasks_by_query(query: str, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fuzzy search for tasks matching the given query string. 
    Useful for LLM to find the correct task ID to update/delete.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        sql = "SELECT * FROM tasks WHERE content LIKE ?"
        params = [f"%{query}%"]
        
        if target_date:
            sql += " AND task_date = ?"
            params.append(target_date)
            
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            tasks.append({
                "id": row["id"],
                "task_date": row["task_date"],
                "time_slot": row["time_slot"],
                "exact_time": row["exact_time"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "content": row["content"],
                "note": row["note"],
                "is_important": bool(row["is_important"]),
                "is_completed": bool(row["is_completed"]),
                "created_at": str(row["created_at"])
            })
        return tasks
    except Exception as e:
        logger.error(f"Error searching tasks: {e}", exc_info=True)
        return []
    finally:
        conn.close()
