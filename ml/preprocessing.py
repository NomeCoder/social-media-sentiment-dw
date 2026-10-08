import re
import string

NEGATION_WORDS = {
    "not", "never", "no", "nor", "neither", "barely", "hardly", "scarcely",
    "don't", "dont", "can't", "cant", "couldn't", "couldnt", "won't", "wont",
    "wouldn't", "wouldnt", "shouldn't", "shouldnt", "isn't", "isnt", "aren't",
    "arent", "wasn't", "wasnt", "weren't", "werent", "haven't", "havent",
    "hasn't", "hasnt", "hadn't", "hadnt"
}

def clean_text(text: str) -> str:
    """
    Cleans raw social media text:
    - Normalizes URLs to a token or removes them
    - Normalizes user mentions (@user)
    - Normalizes whitespace
    - Preserves negation words and sentiment punctuation
    """
    if not isinstance(text, str):
        return ""
    
    # Lowercase
    cleaned = text.lower()
    
    # Replace URLs with http token
    cleaned = re.sub(r'https?://\S+|www\.\S+', ' http ', cleaned)
    
    # Replace mentions with @user token
    cleaned = re.sub(r'@\w+', ' @user ', cleaned)
    
    # Preserve hashtags but strip '#' symbol
    cleaned = re.sub(r'#(\w+)', r'\1', cleaned)
    
    # Normalize repeated punctuation (e.g., '!!!!' -> '!!', '????' -> '??')
    cleaned = re.sub(r'([!?.]){2,}', r'\1\1', cleaned)
    
    # Remove HTML entities (e.g., &amp; -> &)
    cleaned = re.sub(r'&amp;', '&', cleaned)
    cleaned = re.sub(r'&lt;', '<', cleaned)
    cleaned = re.sub(r'&gt;', '>', cleaned)
    
    # Remove extraneous symbols while keeping letters, digits, and basic punctuation
    cleaned = re.sub(r'[^\w\s!?.\'-]', ' ', cleaned)
    
    # Collapse multiple whitespaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def extract_features(text: str) -> dict:
    """
    Extracts tweet metadata features for feature engineering:
    - text_length
    - word_count
    - hashtag_count
    - mention_count
    - url_count
    - exclamation_count
    - question_count
    """
    if not isinstance(text, str):
        return {
            "text_length": 0,
            "word_count": 0,
            "hashtag_count": 0,
            "mention_count": 0,
            "url_count": 0,
            "exclamation_count": 0,
            "question_count": 0
        }
    
    return {
        "text_length": len(text),
        "word_count": len(text.split()),
        "hashtag_count": len(re.findall(r'#\w+', text)),
        "mention_count": len(re.findall(r'@\w+', text)),
        "url_count": len(re.findall(r'https?://\S+|www\.\S+', text)),
        "exclamation_count": text.count('!'),
        "question_count": text.count('?')
    }
