import HalfCircleGauge from "@/components/charts/gaugeChart.jsx";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function calculateMetrics(graphEvents, eventCategories, days) {
  const categoryTotals = {};
  const categoryLabels = [];
  const categoryValues = [];
  const categoryMinutes = [];

  eventCategories.forEach((category) => {
    categoryTotals[category.category] = 0;
    categoryLabels.push(category.category);
  });

  graphEvents.forEach((event) => {
    if (categoryTotals.hasOwnProperty(event.category)) {
      categoryTotals[event.category] += event.minutes;
    }
  });

  eventCategories.forEach((category) => {
    const totalTime = categoryTotals[category.category] || 0;
    const categoryTimeLimit = category.minutes * days;
    const percentage = Math.min(
      Math.round((totalTime / categoryTimeLimit) * 100),
      100
    );
    categoryValues.push(percentage);
    categoryMinutes.push(totalTime);
  });

  let avgFulfillment = 0;
  let standardDeviation = 0;

  if (categoryValues.length > 0) {
    const n = categoryValues.length;
    avgFulfillment = categoryValues.reduce((a, b) => a + b, 0) / n;

    const variance =
      categoryValues.reduce(
        (sum, val) => sum + (val - avgFulfillment) ** 2,
        0
      ) / n;

    standardDeviation = Math.sqrt(variance);
  }

  const roundedFulfillment = Math.round(avgFulfillment);
  const roundedStDev = Math.round(standardDeviation);

  const balance = 100 * (1 - roundedStDev / 50);

  return {
    fulfillment: roundedFulfillment,
    balance: balance,
  };
}

const DayGaugeRegion = ({ events, categories }) => {
  const { fulfillment, balance } = calculateMetrics(events, categories, 1);

  return (
    <div className="flex flex-row h-18 justify-end gap-10 mr-3 mb-3 items-center">
      <div className="h-full aspect-[1/1] shrink-0 ">
        <HalfCircleGauge metricName={"Fulfillment"} score={fulfillment} />
      </div>
      <div className="ml-1 h-full aspect-[1/1] shrink-0">
        <HalfCircleGauge metricName={"Balance"} score={balance} />
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
                  Measures how evenly fulfillment scores are distributed across
                  categories (lower scores = less balanced)
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DayGaugeRegion;
