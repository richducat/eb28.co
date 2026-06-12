# CadetCatch SFace Core ML Receipt

CadetCatch uses an on-device face embedding model for match scoring. The bundled model is converted from OpenCV Zoo SFace:

- Source repository: https://github.com/opencv/opencv_zoo
- Source model path: `models/face_recognition_sface/face_recognition_sface_2021dec.onnx`
- Source model SHA-256: `0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79`
- Frozen ONNX SHA-256: `ae6a6ac44d2bdc87924e75fb23d8212430dd24f037f5e035c21deff99afc8b61`
- Core ML package: `ios/CadetCatch/CadetCatch/Models/SFaceEmbedding.mlpackage`
- License: Apache 2.0, copied to `ios/CadetCatch/CadetCatch/Models/SFace-LICENSE.txt`

The OpenCV Zoo SFace README states that the model files are MobileFaceNet instances trained with SFace loss and that all files in the directory are Apache 2.0 licensed.

Runtime contract:

- Input: `data`, shape `[1, 3, 112, 112]`, RGB channel order, raw pixel values `0...255`.
- The model performs `(input - 127.5) * 0.0078125` internally.
- Output: `embedding`, shape `[1, 128]`.
- CadetCatch L2-normalizes output embeddings before cosine comparison, matching OpenCV `FaceRecognizerSF.match`.

The conversion was sanity checked against ONNX Runtime with a fixed random tensor. The maximum absolute difference between ONNX output and Core ML output was about `0.0064` after FP16 Core ML conversion.
