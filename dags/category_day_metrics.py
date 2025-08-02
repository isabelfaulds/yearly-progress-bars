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
    dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
    today = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print("Querying DateIndex for date:", today)

    events = dynamodb.Table("pb_events")
    categories = dynamodb.Table("pb_categories")
    pb_category_day_metrics = dynamodb.Table("pb_category_day_metrics")

    # Query events table for today's (yesterday , run at midnight) date
    event_response = events.query(
        IndexName="DateIndex", KeyConditionExpression=Key("event_startdate").eq(today)
    )
    df_events = pd.DataFrame(event_response.get("Items", []))

    # Scan categories
    category_response = categories.scan()
    df_categories = pd.DataFrame(category_response.get("Items", []))
    df_categories = df_categories[
        (df_categories["category"] != "Placeholder")
        & (df_categories["minutes"].notna())
    ]
    print(f"Events: {df_events.shape[0]} rows")
    print(f"Categories: {df_categories.shape[0]} rows")

    if df_events.empty:
        print("No data found for today.")
        return

    df_events["minutes"] = pd.to_numeric(df_events["minutes"], errors="coerce")
    # category minutes as queried on that day
    df_categories["planned_minutes"] = pd.to_numeric(
        df_categories["minutes"], errors="coerce"
    )

    # Join events onto all categories , on user_id and category
    df_joined = pd.merge(
        df_categories[["user_id", "category", "planned_minutes"]],
        df_events,
        on=["user_id", "category"],
        how="left",
    )

    # Group and calculate
    df_result = (
        df_joined.groupby(["user_id", "category", "planned_minutes"], as_index=False)
        .agg({"minutes": "sum", "event_uid": "count"})
        .reset_index(drop=True)
        .rename({"minutes": "total_minutes", "event_uid": "total_sessions"}, axis=1)
    )
    print(f"Result DF after groupby: {df_result.shape[0]} rows")

    # Metrics
    df_result = df_result.assign(
        fulfillment_score=(
            df_result["total_minutes"] / df_result["planned_minutes"]
        ).clip(upper=1)
        * 100,  # capping at 1 , 100
        consistency_score=(df_result["total_minutes"] > 0).astype(int),
        category_date_id=df_result["user_id"]
        + ":"
        + df_result["category"]
        + ":"
        + today,
    )

    # Convert float columns to Decimal for DynamoDB
    df_result["total_minutes"] = df_result["total_minutes"].apply(
        lambda x: Decimal(str(x))
    )
    df_result["fulfillment_score"] = df_result["fulfillment_score"].apply(
        lambda x: Decimal(str(x))
    )
    df_result["planned_minutes"] = df_result["planned_minutes"].apply(
        lambda x: Decimal(str(x))
    )
    df_result["consistency_score"] = df_result["consistency_score"].apply(
        lambda x: Decimal(str(x))
    )

    with pb_category_day_metrics.batch_writer() as batch:
        for row in df_result.to_dict(orient="records"):
            batch.put_item(Item=row)

    print(f"Inserted {len(df_result)} rows to pb_category_day_metrics")


with DAG(
    dag_id="category_day_metrics",
    start_date=datetime(2025, 7, 1),
    schedule="15 7 * * *",  # 7:15 UTC for PST = 12:15 am , will need to be changed in november
    catchup=False,
    tags=["day"],
) as dag:
    etl_task = PythonOperator(task_id="run_etl", python_callable=extract_transform_load)
