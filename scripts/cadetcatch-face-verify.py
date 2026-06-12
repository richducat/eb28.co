#!/usr/bin/env python3
"""Cross-setting verification for the CadetCatch SFace Core ML model.

Runs the exact .mlpackage shipped in the app against real photo pairs:
same person in different settings must score above the app's cosine
threshold (0.42); different people must score below it. Also compares
RGB vs BGR channel order to guard against preprocessing regressions.

Setup:
  pip3 install coremltools opencv-python-headless numpy
  curl -L -o /tmp/sface_test/yunet.onnx \
    https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
  Place test photos in /tmp/sface_test (obama_a/b, bush_a, merkel_a/b .jpg
  or edit FACES/PAIRS below).

Result on 2026-06-12 (build 87 model, sface-2021dec-coreml-fp16-v1):
  RGB:  same-person 0.667 / 0.683, different-person -0.03..0.21  -> RGB is correct
  BGR:  same-person 0.575 / 0.688 (worse on one pair)
"""
import sys
import cv2
import numpy as np
import coremltools as ct

MODEL = 'ios/CadetCatch/CadetCatch/Models/SFaceEmbedding.mlpackage'
TESTDIR = '/tmp/sface_test'
THRESHOLD = 0.42

TEMPLATE = np.array([
    [38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
    [41.5493, 92.3655], [70.7299, 92.2041]], dtype=np.float32)

FACES = ['obama_a', 'obama_b', 'bush_a', 'merkel_a', 'merkel_b']
PAIRS = [
    ('obama_a', 'obama_b', 'SAME'), ('merkel_a', 'merkel_b', 'SAME'),
    ('obama_a', 'bush_a', 'DIFF'), ('obama_b', 'bush_a', 'DIFF'),
    ('obama_a', 'merkel_a', 'DIFF'), ('merkel_b', 'bush_a', 'DIFF'),
]

model = ct.models.MLModel(MODEL)
det = cv2.FaceDetectorYN.create(f'{TESTDIR}/yunet.onnx', '', (320, 320), score_threshold=0.6)


def aligned_face(path):
    img = cv2.imread(path)
    h, w = img.shape[:2]
    det.setInputSize((w, h))
    _, faces = det.detect(img)
    if faces is None:
        return None
    f = faces[np.argmax(faces[:, 2] * faces[:, 3])]
    pts = f[4:14].reshape(5, 2).astype(np.float32)
    eyes = sorted(pts[:2], key=lambda p: p[0])
    mouth = sorted(pts[3:5], key=lambda p: p[0])
    src = np.array([eyes[0], eyes[1], pts[2], mouth[0], mouth[1]], dtype=np.float32)
    M, _ = cv2.estimateAffinePartial2D(src, TEMPLATE)
    return cv2.warpAffine(img, M, (112, 112))


def embed(face_bgr, order):
    x = face_bgr if order == 'BGR' else face_bgr[:, :, ::-1]
    arr = x.astype(np.float32).transpose(2, 0, 1)[None]
    out = model.predict({'data': arr})['embedding'].astype(np.float32).flatten()
    return out / np.linalg.norm(out)


faces = {}
for name in FACES:
    f = aligned_face(f'{TESTDIR}/{name}.jpg')
    if f is None:
        print(f'{name}: NO FACE DETECTED')
    else:
        faces[name] = f

failed = False
for order in ['RGB', 'BGR']:
    embs = {k: embed(v, order) for k, v in faces.items()}
    print(f'--- channel order {order} ---')
    for a, b, kind in PAIRS:
        if a not in embs or b not in embs:
            continue
        cos = float(np.dot(embs[a], embs[b]))
        verdict = 'match' if cos >= THRESHOLD else 'no match'
        print(f'{kind}  {a} vs {b}: cosine = {cos:.4f} ({verdict})')
        if order == 'RGB' and ((kind == 'SAME') != (cos >= THRESHOLD)):
            failed = True

sys.exit(1 if failed else 0)
