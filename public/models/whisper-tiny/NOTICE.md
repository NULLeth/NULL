# whisper-tiny (ONNX)

Speech-recognition model used by Private Voice in NULL Chat. It runs in the browser with
onnxruntime-web; audio never leaves the device.

- Model: OpenAI Whisper tiny (multilingual), https://github.com/openai/whisper
- ONNX export and quantization: onnx-community/whisper-tiny, https://huggingface.co/onnx-community/whisper-tiny
- Licence: MIT (Copyright (c) 2022 OpenAI)

Files: encoder_model_quantized.onnx, decoder_model_merged_quantized.onnx, vocab.json,
added_tokens.json, generation_config.json, config.json, preprocessor_config.json (unchanged).
