# ============================================================
# SOCIAL_MEDIA_DW  --  R equivalent of database.sql
# Builds the star schema (FACT_POST + 5 dimensions) from the
# 3 source CSVs, then runs OLAP operations on it:
#   Roll-up, Drill-down, Slice, Dice, Pivot (cross-tab)
# ============================================================



library(dplyr)
library(tidyr)
library(lubridate)
library(readr)
library(stringr)

# ---- 1. File paths -------------------------------------------------------
# Edit these if your files live somewhere else.
path_train   <- "Dataset - Train.csv"
path_tweets  <- "Tweets.csv"
path_bigtech <- "Bigtech - 20-09-2020 till 13-10-2020.csv"

raw_train   <- read_csv(path_train,   show_col_types = FALSE)
raw_tweets  <- read_csv(path_tweets,  show_col_types = FALSE)
raw_bigtech <- read_csv(path_bigtech, show_col_types = FALSE)

norm <- function(x) str_to_lower(str_trim(x))

# ============================================================
# 2. DIMENSION TABLES  (mirrors sections 4-8 of database.sql)
# ============================================================

## -- DIM_SOURCE --------------------------------------------------
DIM_SOURCE <- tibble(
  source_key   = 0:3,
  dataset_name = c("Unknown", "Dataset - Train", "Tweets", "Bigtech"),
  dataset_type = c("Unknown", "Technology/Product Emotion",
                   "Airline Sentiment", "Big Tech Polarity")
)

## -- DIM_SENTIMENT -------------------------------------------------
DIM_SENTIMENT <- tibble(
  sentiment_key       = 0:3,
  sentiment_label     = c("Unknown", "Positive", "Negative", "Neutral"),
  sentiment_score_type = "Categorical/Polarity"
)

## -- DIM_BRAND: one normalized brand per row, unioned across 3 sources --
brands_train <- raw_train %>%
  filter(!is.na(str_trim(emotion_in_tweet_is_directed_at)),
         str_trim(emotion_in_tweet_is_directed_at) != "") %>%
  transmute(normalized_brand = norm(emotion_in_tweet_is_directed_at),
            brand_name       = str_trim(emotion_in_tweet_is_directed_at),
            industry         = "Technology")

brands_tweets <- raw_tweets %>%
  filter(!is.na(str_trim(airline)), str_trim(airline) != "") %>%
  transmute(normalized_brand = norm(airline),
            brand_name       = str_trim(airline),
            industry         = "Airline")

brands_bigtech <- raw_bigtech %>%
  filter(!is.na(str_trim(group_name)), str_trim(group_name) != "") %>%
  transmute(normalized_brand = norm(group_name),
            brand_name       = str_trim(group_name),
            industry         = "Technology")

DIM_BRAND <- bind_rows(brands_train, brands_tweets, brands_bigtech) %>%
  group_by(normalized_brand) %>%
  summarise(
    brand_name = first(sort(brand_name)),
    industry   = if_else(any(industry == "Airline"), "Airline", "Technology"),
    .groups = "drop"
  ) %>%
  arrange(normalized_brand) %>%
  mutate(brand_key = row_number()) %>%
  select(brand_key, brand_name, industry, normalized_brand)

## -- DIM_LOCATION ----------------------------------------------------
loc_train <- raw_train %>%
  filter(!is.na(str_trim(location)), str_trim(location) != "") %>%
  transmute(normalized_location = norm(location), original_location = str_trim(location))

loc_tweets <- raw_tweets %>%
  filter(!is.na(str_trim(tweet_location)), str_trim(tweet_location) != "") %>%
  transmute(normalized_location = norm(tweet_location), original_location = str_trim(tweet_location))

loc_bigtech <- raw_bigtech %>%
  filter(!is.na(str_trim(location)), str_trim(location) != "") %>%
  transmute(normalized_location = norm(location), original_location = str_trim(location))

DIM_LOCATION <- bind_rows(loc_train, loc_tweets, loc_bigtech) %>%
  group_by(normalized_location) %>%
  summarise(location_text = first(sort(original_location)), .groups = "drop") %>%
  arrange(normalized_location) %>%
  mutate(location_key = row_number()) %>%
  bind_rows(tibble(location_key = 0, location_text = "Unknown", normalized_location = NA), .) %>%
  select(location_key, location_text, normalized_location)

## -- DIM_DATE --------------------------------------------------------
dates_train   <- as_date(ymd_hms(raw_train$date, quiet = TRUE))
dates_tweets  <- as_date(parse_date_time(raw_tweets$tweet_created,
                                         orders = "Ymd HMS z", quiet = TRUE))
dates_bigtech <- as_date(ymd_hms(raw_bigtech$created_at, quiet = TRUE))

all_dates <- unique(na.omit(c(dates_train, dates_tweets, dates_bigtech)))

DIM_DATE <- tibble(full_date = all_dates) %>%
  mutate(
    date_key    = as.integer(format(full_date, "%Y%m%d")),
    day         = day(full_date),
    month       = month(full_date),
    month_name  = month(full_date, label = TRUE, abbr = FALSE) %>% as.character(),
    quarter     = quarter(full_date),
    year        = year(full_date),
    day_of_week = wday(full_date, label = TRUE, abbr = FALSE) %>% as.character(),
    is_weekend  = wday(full_date, week_start = 1) %in% c(6, 7)
  ) %>%
  bind_rows(
    tibble(date_key = 0L, full_date = as.Date(NA), day = NA, month = NA,
           month_name = "Unknown", quarter = NA, year = NA,
           day_of_week = "Unknown", is_weekend = FALSE),
    .
  ) %>%
  select(date_key, full_date, day, month, month_name, quarter, year, day_of_week, is_weekend)

# ============================================================
# 3. FACT_POST  (mirrors sections 9-12 of database.sql)
# ============================================================

brand_lookup <- DIM_BRAND %>% select(normalized_brand, brand_key)
loc_lookup   <- DIM_LOCATION %>% select(normalized_location, location_key)

## -- load: Dataset - Train --------------------------------------------
fact_train <- raw_train %>%
  mutate(
    post_id     = NA_character_,
    date_key    = coalesce(as.integer(format(as_date(ymd_hms(date, quiet = TRUE)), "%Y%m%d")), 0L),
    sentiment_key = case_when(
      str_detect(str_to_lower(coalesce(is_there_an_emotion_directed_at_a_brand_or_product, "")), "positive")  ~ 1L,
      str_detect(str_to_lower(coalesce(is_there_an_emotion_directed_at_a_brand_or_product, "")), "negative")  ~ 2L,
      str_detect(str_to_lower(coalesce(is_there_an_emotion_directed_at_a_brand_or_product, "")), "no emotion") ~ 3L,
      TRUE ~ 0L
    ),
    normalized_brand    = norm(emotion_in_tweet_is_directed_at),
    normalized_location = norm(location),
    source_key       = 1L,
    text             = tweet_text,
    retweet_count    = 0L,
    confidence_score = NA_real_,
    sentiment_score  = NA_real_,
    followers        = NA_real_,
    friends          = NA_real_,
    negative_reason  = NA_character_
  ) %>%
  left_join(brand_lookup, by = "normalized_brand") %>%
  left_join(loc_lookup,   by = "normalized_location") %>%
  mutate(brand_key = coalesce(brand_key, 0L), location_key = coalesce(location_key, 0L)) %>%
  select(post_id, date_key, brand_key, sentiment_key, location_key, source_key,
         text, retweet_count, confidence_score, sentiment_score, followers, friends, negative_reason)

## -- load: Tweets (airline) --------------------------------------------
fact_tweets <- raw_tweets %>%
  mutate(
    post_id  = as.character(tweet_id),
    date_key = coalesce(as.integer(format(as_date(parse_date_time(tweet_created, orders = "Ymd HMS z", quiet = TRUE)), "%Y%m%d")), 0L),
    sentiment_key = case_when(
      str_to_lower(str_trim(airline_sentiment)) == "positive" ~ 1L,
      str_to_lower(str_trim(airline_sentiment)) == "negative" ~ 2L,
      str_to_lower(str_trim(airline_sentiment)) == "neutral"  ~ 3L,
      TRUE ~ 0L
    ),
    normalized_brand    = norm(airline),
    normalized_location = norm(tweet_location),
    source_key       = 2L,
    retweet_count    = coalesce(retweet_count, 0L),
    confidence_score = airline_sentiment_confidence,
    sentiment_score  = case_when(
      str_to_lower(str_trim(airline_sentiment)) == "positive" ~ 1,
      str_to_lower(str_trim(airline_sentiment)) == "negative" ~ -1,
      str_to_lower(str_trim(airline_sentiment)) == "neutral"  ~ 0,
      TRUE ~ NA_real_
    ),
    followers       = NA_real_,
    friends         = NA_real_,
    negative_reason = negativereason
  ) %>%
  left_join(brand_lookup, by = "normalized_brand") %>%
  left_join(loc_lookup,   by = "normalized_location") %>%
  mutate(brand_key = coalesce(brand_key, 0L), location_key = coalesce(location_key, 0L)) %>%
  select(post_id, date_key, brand_key, sentiment_key, location_key, source_key,
         text, retweet_count, confidence_score, sentiment_score, followers, friends, negative_reason)

## -- load: Bigtech --------------------------------------------------
fact_bigtech <- raw_bigtech %>%
  mutate(
    post_id  = as.character(twitter_id),
    date_key = coalesce(as.integer(format(as_date(ymd_hms(created_at, quiet = TRUE)), "%Y%m%d")), 0L),
    sentiment_key = case_when(
      polarity > 0 ~ 1L,
      polarity < 0 ~ 2L,
      polarity == 0 ~ 3L,
      TRUE ~ 0L
    ),
    normalized_brand    = norm(group_name),
    normalized_location = norm(location),
    source_key       = 3L,
    retweet_count    = coalesce(retweet_count, 0L),
    confidence_score = NA_real_,
    sentiment_score  = polarity,
    negative_reason  = NA_character_
  ) %>%
  left_join(brand_lookup, by = "normalized_brand") %>%
  left_join(loc_lookup,   by = "normalized_location") %>%
  mutate(brand_key = coalesce(brand_key, 0L), location_key = coalesce(location_key, 0L)) %>%
  select(post_id, date_key, brand_key, sentiment_key, location_key, source_key,
         text, retweet_count, confidence_score, sentiment_score, followers, friends, negative_reason)

FACT_POST <- bind_rows(fact_train, fact_tweets, fact_bigtech) %>%
  mutate(post_key = row_number()) %>%
  select(post_key, everything())

cat("FACT_POST rows:", nrow(FACT_POST),
    "(expected 8589 + 14640 + 266095 = 289324)\n")

# ============================================================
# 4. OLAP OPERATIONS
# ============================================================

fact_full <- FACT_POST %>%
  left_join(DIM_SOURCE,    by = "source_key") %>%
  left_join(DIM_SENTIMENT, by = "sentiment_key") %>%
  left_join(DIM_BRAND %>% select(brand_key, brand_name, industry), by = "brand_key") %>%
  left_join(DIM_DATE %>% select(date_key, year, month, month_name, quarter, day, full_date), by = "date_key") %>%
  left_join(DIM_LOCATION %>% select(location_key, location_text), by = "location_key")

## ---- 4.1 ROLL-UP -----------------------------------------------------
## Aggregate up the date hierarchy: day -> month -> quarter -> year.
## Here: sentiment counts rolled up from (year, month) to just year.
rollup_month_sentiment <- fact_full %>%
  filter(date_key != 0) %>%
  count(year, month, month_name, sentiment_label, name = "post_count")

rollup_year_sentiment <- rollup_month_sentiment %>%
  group_by(year, sentiment_label) %>%
  summarise(post_count = sum(post_count), .groups = "drop") %>%
  arrange(year, sentiment_label)

cat("\n--- ROLL-UP: yearly sentiment totals (rolled up from month) ---\n")
print(rollup_year_sentiment)

## ---- 4.2 DRILL-DOWN ---------------------------------------------------
## Opposite of roll-up: go from year -> quarter -> month -> day for one year.
drilldown_year <- 2015   # change to drill into a different year
drilldown_by_quarter <- fact_full %>%
  filter(year == drilldown_year) %>%
  count(quarter, sentiment_label, name = "post_count") %>%
  arrange(quarter, sentiment_label)

drilldown_by_month <- fact_full %>%
  filter(year == drilldown_year) %>%
  count(month, month_name, sentiment_label, name = "post_count") %>%
  arrange(month, sentiment_label)

cat("\n--- DRILL-DOWN: ", drilldown_year, " by quarter ---\n")
print(drilldown_by_quarter)
cat("\n--- DRILL-DOWN: ", drilldown_year, " by month ---\n")
print(drilldown_by_month)

## ---- 4.3 SLICE ---------------------------------------------------------
## Fix one dimension to a single value: only the Airline industry.
slice_airline <- fact_full %>%
  filter(industry == "Airline") %>%
  count(brand_name, sentiment_label, name = "post_count") %>%
  arrange(desc(post_count))

cat("\n--- SLICE: industry = 'Airline' ---\n")
print(head(slice_airline, 15))

## ---- 4.4 DICE ------------------------------------------------------------
## Filter on multiple dimensions at once: Technology industry,
## Positive sentiment, in 2020, with at least 1 retweet.
dice_tech_positive_2020 <- fact_full %>%
  filter(industry == "Technology",
         sentiment_label == "Positive",
         year == 2020,
         retweet_count >= 1) %>%
  select(post_key, brand_name, text, retweet_count, sentiment_score, full_date)

cat("\n--- DICE: Technology + Positive + 2020 + retweet_count>=1 ---\n")
print(head(dice_tech_positive_2020, 10))
cat("Rows matching dice filter:", nrow(dice_tech_positive_2020), "\n")

## ---- 4.5 PIVOT (cross-tab) --------------------------------------------
## Brand (top 10 by volume) x Sentiment, wide format.
top_brands <- fact_full %>%
  count(brand_name, sort = TRUE) %>%
  slice_max(n, n = 10) %>%
  pull(brand_name)

pivot_brand_sentiment <- fact_full %>%
  filter(brand_name %in% top_brands) %>%
  count(brand_name, sentiment_label) %>%
  pivot_wider(names_from = sentiment_label, values_from = n, values_fill = 0) %>%
  arrange(desc(rowSums(across(where(is.numeric)))))

cat("\n--- PIVOT: top-10 brands x sentiment (cross-tab) ---\n")
print(pivot_brand_sentiment)

## Source x Sentiment pivot (useful sanity check across datasets)
pivot_source_sentiment <- fact_full %>%
  count(dataset_name, sentiment_label) %>%
  pivot_wider(names_from = sentiment_label, values_from = n, values_fill = 0)

cat("\n--- PIVOT: dataset (source) x sentiment ---\n")
print(pivot_source_sentiment)

# ============================================================
# 5. Save results
# ============================================================
out_dir <- "olap_results"
dir.create(out_dir, showWarnings = FALSE)
write_csv(rollup_year_sentiment,       file.path(out_dir, "rollup_year_sentiment.csv"))
write_csv(drilldown_by_quarter,        file.path(out_dir, "drilldown_by_quarter.csv"))
write_csv(drilldown_by_month,          file.path(out_dir, "drilldown_by_month.csv"))
write_csv(slice_airline,               file.path(out_dir, "slice_airline.csv"))
write_csv(dice_tech_positive_2020,     file.path(out_dir, "dice_tech_positive_2020.csv"))
write_csv(pivot_brand_sentiment,       file.path(out_dir, "pivot_brand_sentiment.csv"))
write_csv(pivot_source_sentiment,      file.path(out_dir, "pivot_source_sentiment.csv"))

cat("\nAll OLAP result tables written to './", out_dir, "/'\n", sep = "")
