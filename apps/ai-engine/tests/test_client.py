import asyncio
import json
import sys
import websockets

# Ensure UTF-8 output formatting on Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws"
    print(f"Connecting to WebSocket: {uri}...")

    async with websockets.connect(uri) as websocket:
        print("Connected to AI Engine WebSocket!")

        # Send TEXT_INPUT prompt
        sample_input = {
            "type": "TEXT_INPUT",
            "text": "Thêm lịch họp kế hoạch tuần mới vào 9h sáng mai"
        }

        print(f"\nSending payload: {sample_input}")
        await websocket.send(json.dumps(sample_input))

        # Receive Frame 1: JSON Metadata
        frame1 = await websocket.recv()
        if isinstance(frame1, str):
            metadata = json.loads(frame1)
            print("\nReceived Frame 1 (JSON Metadata):")
            print(json.dumps(metadata, indent=2, ensure_ascii=False))

            has_audio = metadata.get("has_audio", False)
            if has_audio:
                # Receive Frame 2: Binary Audio MP3
                frame2 = await websocket.recv()
                if isinstance(frame2, bytes):
                    output_file = "test_output.mp3"
                    with open(output_file, "wb") as f:
                        f.write(frame2)
                    print(f"\nReceived Frame 2 (Binary MP3 Audio: {len(frame2)} bytes) -> Saved to '{output_file}'!")
        else:
            print(f"Unexpected initial frame type: {type(frame1)}")

if __name__ == "__main__":
    try:
        asyncio.run(test_websocket())
    except Exception as e:
        print(f"Error during WebSocket test: {e}")
        print("Note: Make sure uvicorn server is running via: uvicorn app.main:app --reload")
