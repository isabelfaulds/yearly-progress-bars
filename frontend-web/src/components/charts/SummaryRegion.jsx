import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useCategoryAggregatesByRange } from "@/hooks/useCategoryMetrics.jsx";
import { groupBy } from "lodash";

function MetricDisplay({ metric, score, prevScore }) {
  const scoreOverScore = parseFloat(
    // default 0s to prevent nulls
    (((score ?? 0) - (prevScore ?? 0)) / (prevScore ?? 0) || 0).toFixed(2)
  );

  const isPositive = scoreOverScore > 0;
  const isNegative = scoreOverScore < 0;
  const scoreColor = isPositive
    ? "text-green-500"
    : isNegative
    ? "text-red-500"
    : "text-gray-400";
  const scoreIcon = isPositive
    ? ArrowTrendingUpIcon
    : isNegative
    ? ArrowTrendingDownIcon
    : ArrowRightIcon;
  const ScoreIcon = scoreIcon;
  return (
    <div className="font-inter rounded-xl bg-slate-700 shadow-lg m-2 sm:m-4 p-4">
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-center">
        <div className="">{metric}</div>
        <div className="flex flex-row gap-2">
          <div className=""> {score}</div>
          <ScoreIcon className="h-5" />
          <div className={`${scoreColor}`}>{scoreOverScore}</div>
        </div>
      </div>
    </div>
  );
}

// 2 data arrays per metric: 2 weeks before selected region end, selected range
const SummaryRegion = ({ startDate, endDate, filterCategory = null }) => {
  const {
    data: categoryMetrics,
    isSuccess,
    isLoading,
    isError,
  } = useCategoryAggregatesByRange(startDate, endDate);

  if (isLoading) {
    return <div>.</div>;
  }
  if (isError) {
    return <div>.</div>;
  }
  if (!isSuccess) {
    return <div>.</div>;
  }

  // single flat array of all category metrics
  const allCategoryMetrics = Object.values(categoryMetrics).flat();

  // Group the flattened data by category
  const groupedByCategory = groupBy(allCategoryMetrics, "category");

  // Get the data for the specific category we want to filter by
  const categoryData = groupedByCategory[filterCategory];

  let fulfillmentAvg = 0;
  let consistencyAvg = 0;
  let trendSlope = 0;

  // linear regression coefficent
  const calculateTrend = (data, metricKey) => {
    if (!data || data.length < 2) {
      return 0;
    }

    let sumX = 0; // sum day indices
    let sumY = 0; // sum metric
    let sumXY = 0; // sum (day * metric) products
    let sumX2 = 0; // sum of squared day indices
    const n = data.length;

    for (let i = 0; i < n; i++) {
      const x = i; // day index
      const y = data[i][metricKey]; // metric value

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const numerator = n * sumXY - sumX * sumY; // covariance of x & y
    const denominator = n * sumX2 - sumX * sumX; // variance of x
    if (denominator === 0) {
      return 0;
    }
    const slope = (numerator / denominator).toFixed(2);
    return slope;
  };

  if (categoryData && categoryData.length > 0) {
    const fulfillmentTotal = categoryData.reduce(
      (sum, item) => sum + item.fulfillment_score,
      0
    );
    fulfillmentAvg = Math.round(fulfillmentTotal / categoryData.length);

    const consistencyTotal = categoryData.reduce(
      (sum, item) => sum + item.consistency_score,
      0
    );
    consistencyAvg = Math.round(consistencyTotal / categoryData.length) * 100;

    trendSlope = calculateTrend(categoryData, "fulfillment_score");
  }

  return (
    <div className="flex flex-col font-inter shadow-lg rounded-xl bg-slate-900 m-4 p-3">
      <div className="grid grid-cols-2 sm:flex sm:flex-row text-sm gap-2 justify-between items-end">
        <MetricDisplay
          metric="Consistency"
          score={consistencyAvg}
          // to do get prev score
          prevScore={consistencyAvg}
        />

        <MetricDisplay
          metric="Fulfillment"
          score={fulfillmentAvg}
          // to do get prev score
          prevScore={fulfillmentAvg}
        />

        <MetricDisplay
          metric="Trend"
          score={trendSlope}
          // to do get prev score
          prevScore={trendSlope}
        />
        <div className="flex justify-end">
          <InformationCircleIcon className="h-6 text-gray-400 hover:text-blue-100" />
        </div>
      </div>
    </div>
  );
};

export default SummaryRegion;
