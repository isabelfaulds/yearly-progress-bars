import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCategoryAggregatesByRange } from "@/hooks/useCategoryMetrics.jsx";
import { groupBy } from "lodash";
import { subDays, parseISO, isAfter, isBefore, isEqual } from "date-fns";

function MetricDisplay({ metric, score, prevScore }) {
  const safeScore = score ?? 0;
  const safePrevScore = prevScore ?? 0;

  let scoreChange = 0;

  // Handle the edge cases where prevScore is 0
  if (safePrevScore === 0) {
    if (safeScore > 0) {
      // "infinite increase" , using large value
      scoreChange = 100;
    } else {
      // Both are 0. No change.
      scoreChange = 0;
    }
  } else {
    // percentage change calculation
    scoreChange = ((safeScore - safePrevScore) / safePrevScore) * 100;
  }

  const scoreOverScore = parseFloat(scoreChange.toFixed(2));

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

// Linear regression coefficent
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

// Metrics Calculations
const calculateMetrics = (data) => {
  let fulfillmentAvg = 0;
  let consistencyAvg = 0;
  let trendSlope = 0;

  if (data && data.length > 0) {
    const fulfillmentTotal = data.reduce(
      (sum, item) => sum + (item.fulfillment_score ?? 0), // Use nullish coalescing for safety
      0
    );
    fulfillmentAvg = Math.round(fulfillmentTotal / data.length);

    const consistencyTotal = data.reduce(
      (sum, item) => sum + (item.consistency_score ?? 0),
      0
    );
    consistencyAvg = Math.round(consistencyTotal / data.length) * 100;

    trendSlope = calculateTrend(data, "fulfillment_score");
  }

  return { fulfillmentAvg, consistencyAvg, trendSlope };
};

// 2 data arrays per metric: 2 weeks before selected region end, selected range
const SummaryRegion = ({ startDate, endDate, filterCategory = null }) => {
  const prevStartDate = startDate ? subDays(startDate, 14) : null;
  const prevEndDate = startDate ? subDays(startDate, 1) : null;

  const {
    data: categoryMetrics,
    isSuccess,
    isLoading,
    isError,
  } = useCategoryAggregatesByRange(prevStartDate, endDate);

  const renderPlaceholder = () => (
    <div className="flex flex-col font-inter shadow-lg rounded-xl bg-slate-900 m-4 p-3">
      <div className="grid grid-cols-2 sm:flex sm:flex-row text-sm gap-2 justify-between items-end">
        <div> </div>
        <div> </div>
        <div> </div>
        <div className="flex justify-end">
          <InformationCircleIcon className="h-6 text-gray-400 hover:text-blue-100" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderPlaceholder();
  }
  if (isError) {
    return renderPlaceholder();
  }
  if (!isSuccess) {
    return renderPlaceholder();
  }

  // flatten, group, filter
  const allCategoryMetrics = Object.values(categoryMetrics).flat();
  const groupedByCategory = groupBy(allCategoryMetrics, "category");
  const categoryData = groupedByCategory[filterCategory];

  let currentMetrics = calculateMetrics([]);
  let previousMetrics = calculateMetrics([]);

  if (Array.isArray(categoryData) && categoryData.length > 0) {
    // Filter the data into two periods
    const currentPeriodData = categoryData.filter((item) => {
      const itemDate = parseISO(item.calendar_date);
      return (
        (isAfter(itemDate, prevEndDate) ||
          isEqual(itemDate, subDays(prevEndDate, 1))) &&
        (isBefore(itemDate, endDate) || isEqual(itemDate, endDate))
      );
    });

    const previousPeriodData = categoryData.filter((item) => {
      const itemDate = parseISO(item.calendar_date);
      return (
        (isAfter(itemDate, subDays(prevStartDate, 1)) ||
          isEqual(itemDate, subDays(prevStartDate, 1))) &&
        (isBefore(itemDate, prevEndDate) || isEqual(itemDate, prevEndDate))
      );
    });

    // Calculate metrics for each period
    currentMetrics = calculateMetrics(currentPeriodData);
    previousMetrics = calculateMetrics(previousPeriodData);
  }

  return (
    <div className="flex flex-col font-inter shadow-lg rounded-xl bg-slate-900 m-4 p-3">
      <div className="grid grid-cols-2 sm:flex sm:flex-row text-sm gap-2 justify-between items-end">
        <MetricDisplay
          metric="Consistency"
          score={currentMetrics.consistencyAvg}
          prevScore={previousMetrics.consistencyAvg}
        />

        <MetricDisplay
          metric="Fulfillment"
          score={currentMetrics.fulfillmentAvg}
          prevScore={previousMetrics.fulfillmentAvg}
        />

        <MetricDisplay
          metric="Trend"
          score={currentMetrics.trendSlope}
          prevScore={previousMetrics.trendSlope}
        />
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex justify-end">
              <InformationCircleIcon className="h-6 text-gray-400 hover:text-blue-100" />
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-2-[800px] bg-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="font-lexend">Metrics</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              <div className="space-y-5">
                <div className="flex justify-center items-center">
                  <img
                    src="/kpi-card-screenshot.png"
                    alt="Visual representation of fulfillment score"
                    className="mt-2 rounded-lg shadow-md"
                  />
                </div>

                <div>
                  <p>
                    Direction and Change compare metric scores with the
                    performance of 2 weeks before a filtered period
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Consistency
                  </h4>
                  <p className="text-gray-100">0 - 100</p>
                  <p>
                    Number of days with events in a category compared to the
                    number of all days with synced events
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Fulfillment
                  </h4>
                  <p className="text-gray-100">0 - 100</p>
                  <p>
                    Average time spent on a category compared to the ideal time
                    planned, for days with synced events
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Trend
                  </h4>
                  <p className="text-gray-100">-300 - 300</p>
                  <p>
                    The average daily change in your fulfillment score over the
                    selected period
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SummaryRegion;
