import sys
try:
    from fastembed import TextEmbedding
    model = TextEmbedding()
    print("FastEmbed initialized.")
    embeddings = list(model.embed(["Hello world"]))
    print(f"Generated embedding of size {len(embeddings[0])}")
except Exception as e:
    import traceback
    print("Error:", traceback.format_exc())
