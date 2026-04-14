from .model import load_model
from .preprocess import preprocess_image

model = load_model()

def predict(image_path):
    img = preprocess_image(image_path)
    preds = model.predict(img)
    return preds