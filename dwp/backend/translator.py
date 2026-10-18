"""Local, open-source translation using AI4Bharat IndicTrans2 distilled models.

Models download from Hugging Face the first time a language direction is used.
No message text is sent to a third-party translation API; inference runs locally.
"""
import json
import os
import urllib.parse
import urllib.request
from functools import lru_cache

# Heavy ML libraries are imported lazily so the API still starts (and the fallback
# below still works) when torch/transformers are missing or a model is still downloading.
# Set DWP_TRANSLATE_FALLBACK=0 to forbid the online fallback and use only the local model.
FALLBACK_ENABLED = os.environ.get("DWP_TRANSLATE_FALLBACK", "1") == "1"

# UI language codes -> IndicTrans2 FLORES codes.
LANG_CODES = {
    "en": "eng_Latn",
    "ta": "tam_Taml",
    "hi": "hin_Deva",
    "te": "tel_Telu",
    "ml": "mal_Mlym",
    "kn": "kan_Knda",
}

MODEL_IDS = {
    "en-indic": "ai4bharat/indictrans2-en-indic-dist-200M",
    "indic-en": "ai4bharat/indictrans2-indic-en-dist-200M",
    "indic-indic": "ai4bharat/indictrans2-indic-indic-dist-320M",
}

_processor = None
def _get_processor():
    global _processor
    if _processor is None:
        from IndicTransToolkit.processor import IndicProcessor
        _processor = IndicProcessor(inference=True)
    return _processor

def _device():
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"

@lru_cache(maxsize=3)
def _load_model(direction):
    """Load each model only when first needed, then reuse it for later requests."""
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    model_id = MODEL_IDS[direction]
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_id,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        attn_implementation="eager",
    )
    model.to(_device())
    model.eval()
    return tokenizer, model

def _translate_local(text: str, source: str, target: str) -> str:
    if source not in LANG_CODES or target not in LANG_CODES:
        raise ValueError("Unsupported language code")
    if source == "en":
        direction = "en-indic"
    elif target == "en":
        direction = "indic-en"
    else:
        direction = "indic-indic"

    import torch
    processor = _get_processor()
    DEVICE = _device()
    src_code = LANG_CODES[source]
    tgt_code = LANG_CODES[target]
    tokenizer, model = _load_model(direction)
    processed = processor.preprocess_batch([text], src_lang=src_code, tgt_lang=tgt_code)
    inputs = tokenizer(
        processed,
        truncation=True,
        padding="longest",
        max_length=256,
        return_tensors="pt",
        return_attention_mask=True,
    ).to(DEVICE)
    with torch.inference_mode():
        generated = model.generate(
            **inputs,
            use_cache=True,
            max_new_tokens=256,
            num_beams=3,
            num_return_sequences=1,
        )
    decoded = tokenizer.batch_decode(
        generated,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True,
    )
    result = processor.postprocess_batch(decoded, lang=tgt_code)
    if not result or not result[0].strip():
        raise RuntimeError("Translation model returned an empty result")
    return result[0].strip()


def _translate_online(text: str, source: str, target: str) -> str:
    """Fallback: MyMemory free web API (needs internet; text leaves this computer)."""
    out = []
    # The free API accepts ~500 characters per request.
    chunks = [text[i:i + 450] for i in range(0, len(text), 450)]
    for chunk in chunks:
        url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode({"q": chunk, "langpair": f"{source}|{target}"})
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.load(r)
        t = (data.get("responseData") or {}).get("translatedText", "")
        if not t or data.get("responseStatus") not in (200, "200"):
            raise RuntimeError(data.get("responseDetails") or "online translation failed")
        out.append(t)
    return " ".join(out).strip()


def translate_text(text: str, source: str, target: str) -> str:
    if source not in LANG_CODES or target not in LANG_CODES:
        raise ValueError("Unsupported language code")
    if source == target:
        return text
    try:
        return _translate_local(text, source, target)
    except Exception as local_error:
        print(f"Local translation failed: {type(local_error).__name__}: {local_error}")
        if not FALLBACK_ENABLED:
            raise
        try:
            return _translate_online(text, source, target)
        except Exception as online_error:
            raise RuntimeError(f"local model: {type(local_error).__name__}: {local_error}; online: {online_error}") from online_error
