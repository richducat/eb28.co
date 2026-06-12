#!/usr/bin/env python3
"""Convert OpenCV Zoo SFace ONNX to a CadetCatch Core ML package.

This script is intentionally not part of the app runtime. Run it from a
throwaway Python environment with coremltools, onnx, onnx2torch, and torch.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import coremltools as ct
import onnx
import torch
from onnx2torch import convert


def freeze_initializers(source: Path, destination: Path) -> None:
    model = onnx.load(str(source))
    initializer_names = {initializer.name for initializer in model.graph.initializer}
    graph_inputs = [
        graph_input
        for graph_input in model.graph.input
        if graph_input.name not in initializer_names
    ]
    del model.graph.input[:]
    model.graph.input.extend(graph_inputs)
    onnx.checker.check_model(model)
    onnx.save(model, str(destination))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--onnx", required=True, type=Path)
    parser.add_argument("--frozen-onnx", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    freeze_initializers(args.onnx, args.frozen_onnx)

    onnx_model = onnx.load(str(args.frozen_onnx))
    torch_model = convert(onnx_model)
    torch_model.eval()

    example = torch.zeros(1, 3, 112, 112)
    traced = torch.jit.trace(torch_model, example)

    mlmodel = ct.convert(
        traced,
        convert_to="mlprogram",
        minimum_deployment_target=ct.target.iOS17,
        inputs=[ct.TensorType(name="data", shape=example.shape)],
        outputs=[ct.TensorType(name="embedding")],
        compute_precision=ct.precision.FLOAT16,
    )
    mlmodel.save(str(args.out))


if __name__ == "__main__":
    main()
