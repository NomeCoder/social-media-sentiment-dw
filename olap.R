library(dplyr)
library(tidyr)

train <- read.csv("Dataset - Train.csv")
tweets <- read.csv("Tweets.csv")
bigtech <- read.csv("Bigtech - 20-09-2020 till 13-10-2020.csv")

names(train)
names(tweets)
names(bigtech)

str(train)
str(tweets)
str(bigtech)

fact_post <- bind_rows(
  train %>%
    transmute(
      post_id = NA,
      date = date,
      brand = emotion_in_tweet_is_directed_at,
      sentiment = is_there_an_emotion_directed_at_a_brand_or_product,
      location = location,
      text = tweet_text,
      retweet_count = 0,
      source = "Dataset - Train"
    ),
  
  tweets %>%
    transmute(
      post_id = tweet_id,
      date = tweet_created,
      brand = airline,
      sentiment = airline_sentiment,
      location = tweet_location,
      text = text,
      retweet_count = retweet_count,
      source = "Tweets"
    ),
  
  bigtech %>%
    transmute(
      post_id = twitter_id,
      date = created_at,
      brand = group_name,
      sentiment = case_when(
        polarity > 0 ~ "Positive",
        polarity < 0 ~ "Negative",
        polarity == 0 ~ "Neutral",
        TRUE ~ "Unknown"
      ),
      location = location,
      text = text,
      retweet_count = retweet_count,
      source = "Bigtech"
    )
)

fact_post$date <- as.POSIXct(fact_post$date, 
                             format = "%Y-%m-%d %H:%M:%S",
                             tz = "UTC")

dim_date <- fact_post %>%
  mutate(
    full_date = as.Date(date),
    day = as.integer(format(full_date, "%d")),
    month = as.integer(format(full_date, "%m")),
    month_name = format(full_date, "%B"),
    quarter = paste0("Q", ceiling(month / 3)),
    year = as.integer(format(full_date, "%Y"))
  ) %>%
  distinct(full_date, day, month, month_name, quarter, year) %>%
  arrange(full_date)



fact_post <- fact_post %>%
  mutate(full_date = as.Date(date),
         day = as.integer(format(full_date, "%d")),
         month = as.integer(format(full_date, "%m")),
         quarter = paste0("Q", ceiling(month / 3)),
         year = as.integer(format(full_date, "%Y")))


rollup_month <- fact_post %>%
  group_by(year, month) %>%
  summarise(
    total_posts = n(),
    total_retweets = sum(retweet_count, na.rm = TRUE),
    .groups = "drop"
  )

rollup_month


rollup_year <- fact_post %>%
  group_by(year) %>%
  summarise(
    total_posts = n(),
    total_retweets = sum(retweet_count, na.rm = TRUE),
    .groups = "drop"
  )

rollup_year


drill_down <- fact_post %>%
  group_by(year, quarter, month, day) %>%
  summarise(
    total_posts = n(),
    total_retweets = sum(retweet_count, na.rm = TRUE),
    .groups = "drop"
  )

drill_down


slice_positive <- fact_post %>%
  filter(grepl("positive", sentiment, ignore.case = TRUE))

head(slice_positive)

dice_result <- fact_post %>%
  filter(
    source == "Bigtech",
    sentiment %in% c("Positive", "Negative")
  ) %>%
  group_by(brand, sentiment) %>%
  summarise(
    total_posts = n(),
    total_retweets = sum(retweet_count, na.rm = TRUE),
    .groups = "drop"
  )

dice_result

pivot_result <- fact_post %>%
  group_by(brand, sentiment) %>%
  summarise(
    total_posts = n(),
    .groups = "drop"
  ) %>%
  pivot_wider(
    names_from = sentiment,
    values_from = total_posts,
    values_fill = 0
  )

pivot_result