import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// function MetricDisplayh({ metric, score }) {}
function MetricDisplay({ metric = "Fulfillment", score = 3, prevScore = 10 }) {
  const scoreOverScore = parseFloat(
    (prevScore ? (score - prevScore) / prevScore : 0).toFixed(2)
  );
  const isPositive = scoreOverScore > 0;
  const isNegative = scoreOverScore < 0;
  const isNeutral = scoreOverScore == 0;
  const scoreColor = isPositive
    ? "text-green-500"
    : isNegative
    ? "text-red-500"
    : "text-gray400";
  const scoreIcon = isPositive
    ? ArrowTrendingUpIcon
    : isNegative
    ? ArrowTrendingDownIcon
    : ArrowRightIcon;
  const ScoreIcon = scoreIcon;
  const fulfillmentScore = 3;
  return (
    <div className="font-inter rounded-xl bg-slate-700 shadow-lg m-4 p-4">
      <div className="flex flex-row gap-2">
        <div className="">{metric}</div>
        <div className=""> {score}</div>
        <ScoreIcon className="h-5" />
        <div className={`${scoreColor}`}>{scoreOverScore}</div>
      </div>
    </div>
  );
}

const SummaryRegion = ({
  metric = "Fulfillment",
  score = 3,
  prevScore = 10,
}) => {
  return (
    <div className="flex flex-col font-inter shadow-lg rounded-xl bg-slate-900 m-4 p-4">
      {/* Container for the metric cards with gap for spacing */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2 items-end">
        <MetricDisplay metric="Fulfillment" score={3} prevScore={10} />
        <MetricDisplay metric="Consistency" score={100} prevScore={100} />
        <MetricDisplay metric="Trend" score={30} prevScore={31} />
        {/* Separate container for the info circle, aligned to the right */}
        <div className="flex justify-end">
          <InformationCircleIcon className="h-6 text-gray-400 hover:text-blue-100" />
        </div>
      </div>
    </div>
  );
};

export default SummaryRegion;
