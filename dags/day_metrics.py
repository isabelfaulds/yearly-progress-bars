from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import PythonOperator
from boto3.dynamodb.conditions import Key
from datetime import datetime
import boto3
import pandas as pd
from decimal import Decimal
from datetime import timedelta


def extract_transform_load():
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
    today = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print("Querying DateIndex for date:", today)

    events = dynamodb.Table('pb_events')
    categories = dynamodb.Table('pb_categories')
    pb_day_metrics = dynamodb.Table('pb_day_metrics')


    # Query events table for today's (yesterday , run at midnight) date
    event_response = events.query(
        IndexName="DateIndex",
        KeyConditionExpression=Key("event_startdate").eq(today)
    )
    df_events = pd.DataFrame(event_response.get("Items", []))


    # Scan categories
    category_response = categories.scan()
    df_categories = pd.DataFrame(category_response.get("Items", []))
    df_categories = df_categories[
        (df_categories["category"] != "Placeholder") &
        (df_categories["minutes"].notna())
    ]
    print(f"Events: {df_events.shape[0]} rows")
    print(f"Categories: {df_categories.shape[0]} rows")

    if df_events.empty:
        print("No data found for today.")
        return
    
    df_events["minutes"] = pd.to_numeric(df_events["minutes"], errors="coerce")
    df_categories["category_minutes"] = pd.to_numeric(df_categories["minutes"], errors="coerce")

    # Join events onto all categories , on user_id and category
    df_joined = pd.merge(df_categories[['user_id','category','category_minutes']], df_events, on=["user_id", "category"], how="left")

    # Group and calculate
    df_result = (
        df_joined.groupby(["user_id", "category", "category_minutes"], as_index=False)["minutes"]
        .sum()
    ).reset_index().rename({'minutes':'total_daily_category_minutes'},axis=1)
    print(f"Result DF after groupby: {df_result.shape[0]} rows")
    df_result["daily_percentage"] = (
        df_result["total_daily_category_minutes"] / df_result["category_minutes"]
    ).clip(upper=1)

    df_result = (
        df_result.groupby(["user_id"])["daily_percentage"]
        .mean()
        .reset_index()
        .rename(columns={"daily_percentage": "avg_category_score"})
        .assign(
            calendar_date=today,
            user_date_uid=lambda df: df["user_id"] + ":" + today
        )
    )
    df_result["avg_category_score"] = df_result["avg_category_score"].round(3).apply(lambda x: Decimal(str(x)))
    

    with pb_day_metrics.batch_writer() as batch:
        for row in df_result.to_dict(orient="records"):
            batch.put_item(Item=row)

    print(f"Inserted {len(df_result)} rows to pb_day_metrics")
    



with DAG(
    dag_id="day_metrics",
    start_date=datetime(2025, 7, 1),
    schedule="15 7 * * *",  # 7:15 UTC for PST = 12:15 am , will need to be changed in november
    catchup=False,
    tags=["day"]
) as dag:
    etl_task = PythonOperator(
        task_id="run_etl",
        python_callable=extract_transform_load
    )
