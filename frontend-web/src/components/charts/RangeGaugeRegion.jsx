import HalfCircleGauge from "@/components/charts/gaugeChart.jsx";
import { useMemo } from "react";
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
import { InformationCircleIcon } from "@heroicons/react/24/outline";

const calculateTrend = (data) => {
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
    const y = data[i]; // metric value

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

function calculateMetrics(events, categories, daysArray) {
  const categoriesMap = new Map();
  categories.forEach((cat) => {
    categoriesMap.set(cat.category, cat);
  });
  // 1. Initialize datasets for each category with 0s for each day, ie {'Mindfulness': [0, 0, ...] , ...}
  let category_datasets = {};
  for (const category of categories) {
    category_datasets[category.category] = new Array(daysArray.length).fill(0);
  }
  // 2. Add each event's minutes to corresponding category's day index
  for (const event of events) {
    const dayIndex = daysArray.indexOf(event.start_date); // Both are'YYYY-MM-DD'
    if (category_datasets[event.category] && dayIndex !== -1) {
      category_datasets[event.category][dayIndex] += event.minutes;
    } else {
      console.warn(
        `Event with category '${event.category}' or date '${event.start_date}' could not be processed.`
      );
    }
  }
  // 3. Divide each day's total minutes by its category's time, convert to whole percentage
  const finalCategoryPercentages = {};
  // category dataset keys category names
  for (const categoryName in category_datasets) {
    if (category_datasets.hasOwnProperty(categoryName)) {
      // Skip prototype properties
      const dailyMinutesArray = category_datasets[categoryName];
      const categoryData = categoriesMap.get(categoryName);
      if (categoryData && categoryData.minutes !== undefined) {
        const categoryTime = categoryData.minutes;
        // iterate through the indices of the day arrays
        finalCategoryPercentages[categoryName] = dailyMinutesArray.map(
          (dailyMinutes) => {
            if (categoryTime === 0) {
              // Avoid division by zero
              return 1;
            }
            const percentage = (dailyMinutes / categoryTime) * 100;
            return Math.min(percentage, 100);
          }
        );
      } else {
        finalCategoryPercentages[categoryName] = new Array(
          daysArray.length
        ).fill(0);
        console.warn(`Missing minutes limit for category: ${categoryName}.`);
      }
    }
  }

  const series = Object.values(finalCategoryPercentages); // array of per-category arrays

  let avgMeanRounded = 0;
  let trendSlope = 0;
  let roundedBalanceScore = 0;

  //   fulfillment - ratios
  const { sumByDay, countByDay } = series.reduce(
    (acc, arr) => {
      for (let i = 0; i < daysArray.length; i++) {
        const v = arr[i];
        if (Number.isFinite(v)) {
          acc.sumByDay[i] += v;
          acc.countByDay[i] += 1;
        }
      }
      return acc;
    },
    {
      sumByDay: new Array(daysArray.length).fill(0),
      countByDay: new Array(daysArray.length).fill(0),
    }
  );

  const meanByDay = sumByDay.map((s, i) =>
    countByDay[i] ? s / countByDay[i] : 0
  );

  const avgMean =
    meanByDay.reduce((sum, val) => sum + val, 0) / meanByDay.length;
  avgMeanRounded = Math.round(avgMean);

  // --- balance - standard deviation ---
  const varSumByDay = series.reduce((acc, arr) => {
    for (let i = 0; i < daysArray.length; i++) {
      const v = arr[i];
      if (Number.isFinite(v)) {
        const diff = v - meanByDay[i];
        acc[i] += diff * diff;
      }
    }
    return acc;
  }, new Array(daysArray.length).fill(0));

  const varianceByDay = varSumByDay.map((s, i) =>
    countByDay[i] ? s / countByDay[i] : 0
  );
  const stdDevByDay = varianceByDay.map(Math.sqrt);

  const avgStd =
    stdDevByDay.reduce((a, b) => a + b, 0) / (stdDevByDay.length || 1);
  const balanceScore = 100 * (1 - avgStd / 50);
  roundedBalanceScore = Math.round(balanceScore);

  //  --- trend - linear regression coefficient
  trendSlope = calculateTrend(meanByDay);

  return {
    avgFulfillment: avgMeanRounded,
    balance: roundedBalanceScore,
    trend: trendSlope,
  };
}

const RangeGaugeRegion = ({ events, categories, daysArray }) => {
  const results = useMemo(
    () => calculateMetrics(events, categories, daysArray),
    [events, categories, daysArray]
  );

  const fulfillment = results?.avgFulfillment ?? 0;
  const balance = results?.balance ?? 0;
  const trend = results?.trend ?? 0;

  return (
    <div className="-mx-10 -p sm:mx-0">
      <div className="flex justify-center items-center gap-4 sm:gap-10 h-18 sm:h-16 md:h-20">
        <div className="h-full aspect-[1/1] shrink-0">
          <HalfCircleGauge metricName="Fulfillment" score={fulfillment} />
        </div>
        <div className="h-full aspect-[1/1] shrink-0">
          <HalfCircleGauge metricName="Balance" score={balance} />
        </div>
        <div className="h-full aspect-[1/1] shrink-0">
          <HalfCircleGauge metricName="Trend" score={trend} />
        </div>
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
                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Fulfillment
                  </h4>
                  <p className="text-gray-100">0 - 100</p>
                  <p>
                    Average of all categories’ fulfillment scores, where each
                    score is the ratio of time spent to ideal time
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Balance
                  </h4>
                  <p className="text-gray-100">0 - 100</p>
                  <p>
                    Measures how evenly fulfillment scores are distributed
                    across categories (lower scores = less balanced)
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-white text-[1.06rem]">
                    Trend
                  </h4>
                  <p className="text-gray-100">-300 - 300</p>
                  <p>
                    The average daily change in the average fulfillment score
                    over the selected period
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

export default RangeGaugeRegion;
