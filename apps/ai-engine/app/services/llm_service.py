import json
import logging
from typing import Any, Dict
from groq import AsyncGroq

from app.config import settings
from app.services.prompts import get_system_prompt
from app.services.task_service import add_tasks, get_tasks_by_date, update_task, delete_task, search_tasks_by_query

logger = logging.getLogger(__name__)

def _get_groq_client() -> AsyncGroq | None:
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY is not configured.")
        return None
    return AsyncGroq(api_key=settings.groq_api_key)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Lấy danh sách công việc theo ngày hoặc xem lịch trình (VD: 'hôm nay có lịch gì', 'ngày 26 có lịch gì')",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_date": {
                        "type": "string",
                        "description": "Ngày cần xem (YYYY-MM-DD)"
                    }
                },
                "required": ["target_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Tạo một công việc, sự kiện hoặc lịch hẹn mới (VD: 'thêm lịch họp chiều nay', 'nhắc tôi mua cà phê')",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "Tiêu đề hoặc nội dung công việc"
                    },
                    "task_date": {
                        "type": "string",
                        "description": "Ngày thực hiện (YYYY-MM-DD)"
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Giờ bắt đầu (HH:MM) nếu có"
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Giờ kết thúc (HH:MM) nếu có"
                    },
                    "is_important": {
                        "type": "boolean",
                        "description": "Có quan trọng không (VD: gấp, quan trọng)"
                    },
                    "note": {
                        "type": "string",
                        "description": "Ghi chú chi tiết nếu có"
                    }
                },
                "required": ["content", "task_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Cập nhật, sửa đổi nội dung, dời ngày, đổi giờ hoặc đánh dấu quan trọng cho công việc hiện tại",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_query": {
                        "type": "string",
                        "description": "Tên công việc hoặc từ khóa để tìm kiếm (VD: 'họp', 'mua cà phê')"
                    },
                    "target_date": {
                        "type": "string",
                        "description": "Tìm trong ngày này (YYYY-MM-DD), nếu không nói rõ thì để trống"
                    },
                    "new_date": {
                        "type": "string",
                        "description": "Ngày mới (YYYY-MM-DD) nếu muốn dời lịch"
                    },
                    "new_start_time": {
                        "type": "string",
                        "description": "Giờ bắt đầu mới (HH:MM)"
                    },
                    "is_important": {
                        "type": "boolean",
                        "description": "Đánh dấu là quan trọng (true) hoặc bỏ (false)"
                    },
                    "is_completed": {
                        "type": "boolean",
                        "description": "Đánh dấu là hoàn thành (true)"
                    }
                },
                "required": ["search_query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Xóa hoặc hủy bỏ một công việc",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_query": {
                        "type": "string",
                        "description": "Tên công việc hoặc từ khóa để tìm kiếm (VD: 'họp', 'mua cà phê')"
                    },
                    "target_date": {
                        "type": "string",
                        "description": "Ngày của công việc (YYYY-MM-DD), nếu không nói rõ thì để trống"
                    }
                },
                "required": ["search_query"]
            }
        }
    }
]

async def handle_voice_command(user_text: str) -> Dict[str, Any]:
    """
    Parse user text using Groq Tool Calling, execute the tool, and return intent + TTS reply.
    """
    fallback_response = {
        "intent": "UNKNOWN",
        "reply_text": "Xin lỗi, tôi chưa hiểu rõ ý của bạn. Bạn có thể nói lại được không?"
    }

    if not user_text or not user_text.strip():
        return fallback_response

    client = _get_groq_client()
    if client is None:
        fallback_response["reply_text"] = "Chưa cấu hình GROQ_API_KEY. Vui lòng kiểm tra file .env."
        return fallback_response

    try:
        system_instruction = get_system_prompt()
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_text}
        ]

        response = await client.chat.completions.create(
            messages=messages,
            model=settings.groq_model,
            temperature=0.2,
            tools=TOOLS,
            tool_choice="auto"
        )

        message = response.choices[0].message
        tool_calls = message.tool_calls

        if not tool_calls:
            # If no tools called, it's just a general conversation
            reply_text = message.content if message.content else "Tôi không tìm thấy lịch trình nào trong câu nói của bạn."
            return {
                "intent": "UNKNOWN",
                "reply_text": reply_text
            }

        # Handle the first tool call
        tool_call = tool_calls[0]
        function_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        
        reply_text = ""

        if function_name == "get_tasks":
            target_date = args.get("target_date")
            tasks = get_tasks_by_date(target_date)
            if tasks:
                task_list_str = ", ".join([t['content'] for t in tasks])
                reply_text = f"Bạn có {len(tasks)} công việc: {task_list_str}"
            else:
                reply_text = "Bạn không có công việc nào trong ngày này."
            return {"intent": "GET_TASKS", "reply_text": reply_text}

        elif function_name == "create_task":
            new_task = {
                "content": args.get("content"),
                "task_date": args.get("task_date"),
                "start_time": args.get("start_time"),
                "end_time": args.get("end_time"),
                "is_important": args.get("is_important"),
                "note": args.get("note")
            }
            add_tasks([new_task])
            reply_text = f"Đã thêm công việc '{new_task['content']}' vào lịch."
            return {"intent": "ADD_TASK", "reply_text": reply_text}

        elif function_name == "update_task":
            search_query = args.get("search_query")
            target_date = args.get("target_date")
            found_tasks = search_tasks_by_query(search_query, target_date)
            
            if not found_tasks:
                reply_text = f"Không tìm thấy công việc nào chứa từ khóa '{search_query}' để sửa."
            else:
                # Update the first matching task
                task_to_update = found_tasks[0]
                updates = {}
                if args.get("new_date"): updates["task_date"] = args.get("new_date")
                if args.get("new_start_time"): updates["start_time"] = args.get("new_start_time")
                if args.get("is_important") is not None: updates["is_important"] = args.get("is_important")
                if args.get("is_completed") is not None: updates["is_completed"] = args.get("is_completed")

                if updates:
                    update_task(task_to_update["id"], updates)
                    reply_text = f"Đã cập nhật công việc '{task_to_update['content']}'."
                else:
                    reply_text = "Không có thông tin gì mới để cập nhật."
            return {"intent": "UPDATE_TASK", "reply_text": reply_text}

        elif function_name == "delete_task":
            search_query = args.get("search_query")
            target_date = args.get("target_date")
            found_tasks = search_tasks_by_query(search_query, target_date)
            
            if not found_tasks:
                reply_text = f"Không tìm thấy công việc nào chứa từ khóa '{search_query}' để xóa."
            else:
                task_to_delete = found_tasks[0]
                delete_task(task_to_delete["id"])
                reply_text = f"Đã xóa công việc '{task_to_delete['content']}' khỏi lịch."
            return {"intent": "DELETE_TASK", "reply_text": reply_text}

        return fallback_response

    except Exception as e:
        logger.error(f"Error executing tools with Groq API: {e}", exc_info=True)
        return {"intent": "UNKNOWN", "reply_text": f"Lỗi xử lý câu lệnh AI. {e}"}
