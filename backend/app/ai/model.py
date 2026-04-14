import tensorflow as tf

def load_model():
    model = tf.keras.applications.MobileNetV2(weights="imagenet")
    return model