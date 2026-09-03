import os
import secrets

from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)

app.config["SECRET_KEY"] = secrets.token_hex(32)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)


@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("join")
def handle_join(data):
    room = str(data.get("room", "")).strip().upper()
    name = str(data.get("name", "Guest")).strip()[:40] or "Guest"

    if not room:
        return

    join_room(room)

    emit(
        "room_joined",
        {
            "room": room,
            "name": name
        }
    )

    emit(
        "peer_joined",
        {
            "name": name
        },
        to=room,
        include_self=False
    )


@socketio.on("signal")
def handle_signal(data):
    if data.get("room") and data.get("payload"):
        emit(
            "signal",
            {
                "payload": data["payload"]
            },
            to=data["room"],
            include_self=False
        )


@socketio.on("chat")
def handle_chat(data):
    message = str(data.get("message", "")).strip()[:1000]

    if data.get("room") and message:
        emit(
            "chat",
            {
                "name": str(data.get("name", "Guest"))[:40],
                "message": message
            },
            to=data["room"]
        )


@socketio.on("leave")
def handle_leave(data):
    room = data.get("room")

    if room:
        leave_room(room)
        emit(
            "peer_left",
            {},
            to=room
        )


# فقط وقتی app.py را مستقیم اجرا می‌کنیم، سرور داخلی اجرا شود.
# Railway با Gunicorn این قسمت را اجرا نمی‌کند.
if __name__ == "__main__":
    print("COLLAB FIXED SERVER")
    print("Starting server...")

    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        debug=False,
        allow_unsafe_werkzeug=True
    )