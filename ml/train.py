import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix
from ml.preprocessing import clean_text

def load_and_prepare_data():
    records = []
    
    # 1. Dataset - Train.csv
    train_path = "Dataset - Train.csv"
    if os.path.exists(train_path):
        df_train = pd.read_csv(train_path)
        mapping_train = {
            "Positive emotion": "positive",
            "Negative emotion": "negative",
            "No emotion toward brand or product": "neutral"
        }
        for _, row in df_train.iterrows():
            raw_label = row.get("is_there_an_emotion_directed_at_a_brand_or_product")
            if raw_label in mapping_train:
                text = str(row.get("tweet_text", ""))
                if text.strip():
                    records.append({
                        "text": text,
                        "sentiment": mapping_train[raw_label],
                        "source": "train_dataset"
                    })
    
    # 2. Tweets.csv
    tweets_path = "Tweets.csv"
    if os.path.exists(tweets_path):
        df_tweets = pd.read_csv(tweets_path)
        for _, row in df_tweets.iterrows():
            sentiment = str(row.get("airline_sentiment", "")).lower()
            if sentiment in ["positive", "neutral", "negative"]:
                text = str(row.get("text", ""))
                if text.strip():
                    records.append({
                        "text": text,
                        "sentiment": sentiment,
                        "source": "tweets_airline"
                    })
                    
    df = pd.DataFrame(records)
    print(f"Total labeled records loaded: {len(df)}")
    print(df["sentiment"].value_counts())
    return df

def train_sentiment_model():
    os.makedirs("ml/models", exist_ok=True)
    df = load_and_prepare_data()
    
    # Preprocess text
    print("Preprocessing text...")
    df["clean_text"] = df["text"].apply(clean_text)
    
    X = df["clean_text"]
    y = df["sentiment"]
    
    # 80/20 train/test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")
    
    # Vectorizer
    vectorizer = TfidfVectorizer(
        max_features=12000,
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True
    )
    
    print("Fitting TF-IDF vectorizer...")
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # Classifier
    print("Training Logistic Regression model...")
    model = LogisticRegression(
        C=2.0,
        max_iter=1000,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train_vec, y_train)
    
    # Evaluation
    y_pred = model.predict(X_test_vec)
    accuracy = accuracy_score(y_test, y_pred)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average="macro")
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
    
    labels = ["positive", "neutral", "negative"]
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    eval_metrics = {
        "accuracy": round(float(accuracy), 4),
        "macro_f1": round(float(f1_macro), 4),
        "macro_precision": round(float(precision_macro), 4),
        "macro_recall": round(float(recall_macro), 4),
        "weighted_f1": round(float(f1_weighted), 4),
        "weighted_precision": round(float(precision_weighted), 4),
        "weighted_recall": round(float(recall_weighted), 4),
        "confusion_matrix": {
            "labels": labels,
            "matrix": cm.tolist()
        },
        "classification_report": report,
        "sample_counts": {
            "total": len(df),
            "train": len(X_train),
            "test": len(X_test)
        }
    }
    
    print("\n--- MODEL PERFORMANCE ---")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Macro F1: {f1_macro:.4f}")
    print(f"Weighted F1: {f1_weighted:.4f}")
    print("\nConfusion Matrix (positive, neutral, negative):")
    print(cm)
    
    # Save artifacts
    vectorizer_path = "ml/models/tfidf_vectorizer.pkl"
    model_path = "ml/models/sentiment_model.pkl"
    metrics_path = "ml/model_evaluation.json"
    
    joblib.dump(vectorizer, vectorizer_path)
    joblib.dump(model, model_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(eval_metrics, f, indent=2)
        
    print(f"\nArtifacts saved successfully:")
    print(f"- Vectorizer: {vectorizer_path}")
    print(f"- Model: {model_path}")
    print(f"- Metrics: {metrics_path}")
    
    return model, vectorizer, eval_metrics

if __name__ == "__main__":
    train_sentiment_model()
