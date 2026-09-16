"""Port of FileUploadController (/api/upload) + the /uploads/** static serving.

NOTE: error payloads here intentionally use the plain {"error": ...} shape,
mirroring Java's Map.of("error", ...) responses (not the standard envelope).
"""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request, send_from_directory

from ..guard import login_required

bp = Blueprint("upload", __name__)

ALLOWED_PREFIX = "image/"


def _save_dir():
    # Port of getUploadPath(): configured dir, else <cwd>/uploads/profiles.
    configured = current_app.config["UPLOAD_DIR"]
    if os.path.isabs(configured):
        target = configured
    else:
        target = os.path.abspath(os.path.join(os.getcwd(), configured))
    os.makedirs(target, exist_ok=True)
    return target


def _serve_base():
    # Port of WebConfig's resource handler: serve /uploads/** from <cwd>/uploads.
    return os.path.abspath(os.path.join(os.getcwd(), "uploads"))


@bp.post("/profile-photo")
@login_required
def upload_profile_photo():
    file = request.files.get("file")
    if file is None or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    content_type = file.content_type or ""
    if not content_type.startswith(ALLOWED_PREFIX):
        return jsonify({"error": "Only image files are allowed"}), 400

    try:
        original = file.filename or ""
        ext = os.path.splitext(original)[1] if "." in original else ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        file.save(os.path.join(_save_dir(), filename))
        return jsonify({"url": f"/uploads/profiles/{filename}",
                        "filename": filename}), 200
    except OSError as exc:
        return jsonify({"error": f"Failed to save file: {exc}"}), 500


@bp.get("/uploads/<path:filename>")
def serve_upload(filename):
    # Static serving for the URLs returned above (login not required, like Java).
    return send_from_directory(_serve_base(), filename)
