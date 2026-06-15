#!/usr/bin/env python3
"""Consent-safe cross-setting verification for the CadetCatch SFace model.

This harness runs the Core ML model shipped in the app against local fixture
photos that you provide. Use only people who have consented to this test, or
synthetic/non-real face fixtures. Do not use celebrities, public figures, or
unconsented people.

Setup:
  python3 -m pip install coremltools opencv-python-headless numpy
  curl -L -o /tmp/cadetcatch_face_fixtures/yunet.onnx \
    https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

Create /tmp/cadetcatch_face_fixtures/pairs.json:
  {
    "faces": {
      "person_a_profile": "person_a_profile.jpg",
      "person_a_event": "person_a_event.jpg",
      "person_b_profile": "person_b_profile.jpg"
    },
    "pairs": [
      {"left": "person_a_profile", "right": "person_a_event", "same": true},
      {"left": "person_a_profile", "right": "person_b_profile", "same": false}
    ]
  }

Run:
  scripts/cadetcatch-face-verify.py \
    --testdir /tmp/cadetcatch_face_fixtures \
    --pairs /tmp/cadetcatch_face_fixtures/pairs.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
    import coremltools as ct
except ModuleNotFoundError as error:
    print(f"Missing dependency: {error.name}", file=sys.stderr)
    print("Install with: python3 -m pip install coremltools opencv-python-headless numpy", file=sys.stderr)
    sys.exit(2)


DEFAULT_MODEL = Path("ios/CadetCatch/CadetCatch/Models/SFaceEmbedding.mlpackage")
DEFAULT_TESTDIR = Path("/tmp/cadetcatch_face_fixtures")
THRESHOLD = 0.42

TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--testdir", type=Path, default=DEFAULT_TESTDIR)
    parser.add_argument("--pairs", type=Path)
    parser.add_argument("--yunet", type=Path)
    parser.add_argument("--threshold", type=float, default=THRESHOLD)
    parser.add_argument("--compare-bgr", action="store_true")
    args = parser.parse_args()

    pairs_path = args.pairs or args.testdir / "pairs.json"
    yunet_path = args.yunet or args.testdir / "yunet.onnx"
    require_file(args.model, "Core ML model")
    require_file(pairs_path, "fixture pair manifest")
    require_file(yunet_path, "YuNet face detector")

    fixture = load_fixture(pairs_path, args.testdir)
    model = ct.models.MLModel(str(args.model))
    detector = cv2.FaceDetectorYN.create(str(yunet_path), "", (320, 320), score_threshold=0.6)

    aligned = {}
    for name, image_path in fixture["faces"].items():
        face = aligned_face(image_path, detector)
        if face is None:
            print(f"{name}: NO FACE DETECTED ({image_path})")
        else:
            aligned[name] = face

    failed = False
    orders = ["RGB", "BGR"] if args.compare_bgr else ["RGB"]
    for order in orders:
        embeddings = {name: embed(face, model, order) for name, face in aligned.items()}
        print(f"--- channel order {order} ---")
        for pair in fixture["pairs"]:
            left = pair["left"]
            right = pair["right"]
            same = pair["same"]
            if left not in embeddings or right not in embeddings:
                failed = True
                print(f"SKIP {left} vs {right}: missing detected face")
                continue

            cosine = float(np.dot(embeddings[left], embeddings[right]))
            matched = cosine >= args.threshold
            expected = "SAME" if same else "DIFF"
            verdict = "match" if matched else "no match"
            print(f"{expected}  {left} vs {right}: cosine = {cosine:.4f} ({verdict})")

            if order == "RGB" and matched != same:
                failed = True

    return 1 if failed else 0


def load_fixture(pairs_path: Path, testdir: Path) -> dict:
    raw = json.loads(pairs_path.read_text())
    faces = raw.get("faces", {})
    pairs = raw.get("pairs", [])
    if not faces or not pairs:
        raise SystemExit("pairs.json must contain non-empty 'faces' and 'pairs' fields.")

    normalized_faces = {}
    for name, value in faces.items():
        image_path = Path(value)
        if not image_path.is_absolute():
            image_path = testdir / image_path
        require_file(image_path, f"fixture image for {name}")
        normalized_faces[name] = image_path

    normalized_pairs = []
    for pair in pairs:
        left = pair.get("left")
        right = pair.get("right")
        same = pair.get("same")
        if left not in normalized_faces or right not in normalized_faces or not isinstance(same, bool):
            raise SystemExit("Each pair must reference known faces and include boolean 'same'.")
        normalized_pairs.append({"left": left, "right": right, "same": same})

    return {"faces": normalized_faces, "pairs": normalized_pairs}


def require_file(path: Path, label: str) -> None:
    if not path.exists():
        raise SystemExit(f"Missing {label}: {path}")


def aligned_face(path: Path, detector):
    image = cv2.imread(str(path))
    if image is None:
        return None

    height, width = image.shape[:2]
    detector.setInputSize((width, height))
    _, faces = detector.detect(image)
    if faces is None:
        return None

    face = faces[np.argmax(faces[:, 2] * faces[:, 3])]
    points = face[4:14].reshape(5, 2).astype(np.float32)
    eyes = sorted(points[:2], key=lambda point: point[0])
    mouth = sorted(points[3:5], key=lambda point: point[0])
    source = np.array([eyes[0], eyes[1], points[2], mouth[0], mouth[1]], dtype=np.float32)
    transform, _ = cv2.estimateAffinePartial2D(source, TEMPLATE)
    if transform is None:
        return None
    return cv2.warpAffine(image, transform, (112, 112))


def embed(face_bgr, model, order: str):
    pixels = face_bgr if order == "BGR" else face_bgr[:, :, ::-1]
    input_array = pixels.astype(np.float32).transpose(2, 0, 1)[None]
    output = model.predict({"data": input_array})["embedding"].astype(np.float32).flatten()
    norm = np.linalg.norm(output)
    if norm <= 0:
        raise SystemExit("Model produced a zero-length embedding.")
    return output / norm


if __name__ == "__main__":
    sys.exit(main())
