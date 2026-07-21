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
            content = item.get("content", "").strip()
            is_important = 1 if item.get("is_important") else 0

            if not content:
                continue

            cursor.execute("""
                INSERT INTO tasks (id, task_date, time_slot, exact_time, content, is_important, is_completed)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            """, (task_id, task_date, time_slot, exact_time, content, is_important))

            created_tasks.append({
                "id": task_id,
                "task_date": task_date,
                "time_slot": time_slot,
                "exact_time": exact_time,
                "content": content,
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
            SELECT id, task_date, time_slot, exact_time, content, is_important, is_completed, created_at
            FROM tasks
            WHERE task_date = ?
            ORDER BY exact_time ASC, created_at ASC
        """, (target_date,))

        rows = cursor.fetchall()
        tasks = []
        for row in rows:
            tasks.append({
                "id": row["id"],
                "task_date": row["task_date"],
                "time_slot": row["time_slot"],
                "exact_time": row["exact_time"],
                "content": row["content"],
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

def process_intent_and_execute(parsed_intent: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute database actions according to intent returned by Gemini NLP.
    """
    intent = parsed_intent.get("intent", "UNKNOWN")
    raw_tasks = parsed_intent.get("tasks", [])
    reply_text = parsed_intent.get("reply_text", "")

    result_tasks: List[Dict[str, Any]] = []

    if intent == "ADD_TASK":
        result_tasks = add_tasks(raw_tasks)
    elif intent == "GET_TASKS":
        target_date = raw_tasks[0].get("task_date") if raw_tasks else None
        result_tasks = get_tasks_by_date(target_date)
        if result_tasks:
            task_list_str = "; ".join([t['content'] for t in result_tasks])
            reply_text = f"Bạn có {len(result_tasks)} công việc: {task_list_str}"
        else:
            reply_text = "Bạn không có công việc nào trong danh sách cho ngày này."

    return {
        "intent": intent,
        "reply_text": reply_text,
        "tasks": result_tasks
    }
