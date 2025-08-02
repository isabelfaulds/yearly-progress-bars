#### KPIS

- Fulfillment Score - `fulfillment_score` , total time / planned time \* 100
- Total Time - total time in a period, shown with Fulfillment Score
- Consistency Score - `consistency_score` , 1 if an event exists, 0 if events exist in the day / period but not in the tracked field, null if no events tracked that day. Averaged(consistency scores in a time frame) \* 100 excluding nulls, ie 1 for a day , 33 for a week
- Trend Score - `trend_score` , linear regression coefficient -100 to 100 , weighted on recent events
- Balance Score - `balance_score` standard deviation, square root of variance, across varying Fulfillment Scores, range 0-50
- Weekly Average Score - sum( all scores in day range that aren't null / untracked ) / count( all days in range that aren't null / untracked )
- Week over Week Score - ( Weekly Average Score minus Last week Weekly Average Score ) / Last week score , if Last week score = 0 or null then 100
