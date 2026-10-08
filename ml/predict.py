import os
import joblib
from ml.preprocessing import clean_text

class SentimentPredictor:
    _instance = None

    def __init__(self, model_path="ml/models/sentiment_model.pkl", vectorizer_path="ml/models/tfidf_vectorizer.pkl"):
        self.model_path = model_path
        self.vectorizer_path = vectorizer_path
        self.model = None
        self.vectorizer = None
        self._load()

    def _load(self):
        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
        else:
            self.model = None
            self.vectorizer = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = SentimentPredictor()
        return cls._instance

    def predict(self, text: str) -> dict:
        if self.model is None or self.vectorizer is None:
            self._load()
            if self.model is None or self.vectorizer is None:
                return {
                    "error": "Model or vectorizer not loaded. Please train the model first.",
                    "sentiment": "unknown",
                    "confidence": 0.0,
                    "probabilities": {}
                }

        cleaned = clean_text(text)
        if not cleaned:
            return {
                "sentiment": "neutral",
                "confidence": 0.5,
                "probabilities": {"positive": 0.25, "neutral": 0.5, "negative": 0.25}
            }

        vec = self.vectorizer.transform([cleaned])
        pred_label = self.model.predict(vec)[0]
        probs = self.model.predict_proba(vec)[0]
        
        classes = self.model.classes_
        prob_dict = {cls: round(float(prob), 4) for cls, prob in zip(classes, probs)}
        confidence = float(max(probs))

        # Sentiment score map: positive -> 1.0, neutral -> 0.0, negative -> -1.0
        score_map = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}
        sentiment_score = score_map.get(pred_label, 0.0)

        return {
            "text": text,
            "cleaned_text": cleaned,
            "sentiment": pred_label,
            "confidence": round(confidence, 4),
            "sentiment_score": sentiment_score,
            "probabilities": prob_dict
        }

def predict_sentiment(text: str) -> dict:
    predictor = SentimentPredictor.get_instance()
    return predictor.predict(text)
