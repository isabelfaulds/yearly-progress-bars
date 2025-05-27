const CategoryTotals = ({ events, categories }) => {
  const categoryTotals = events.reduce((acc, event) => {
    if (categories.some((cat) => cat.category === event.category)) {
      acc[event.category] = (acc[event.category] || 0) + event.minutes;
    }
    return acc;
  }, {});
  // Sorted by name
  const sortedCategoryTimes = Object.keys(categoryTotals)
    .map((categoryName) => {
      const totalMins = categoryTotals[categoryName];
      const hours = Math.floor(totalMins / 60);
      const minutes = totalMins % 60;
      const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      return [
        categoryName,
        {
          hours: hours,
          minutes: minutes,
          formattedTime: formattedTime,
        },
      ];
    })
    .sort(([catA], [catB]) => catA.localeCompare(catB));

  return (
    <div className="w-full max-w-sm mt-4 p-4 rounded-lg shadow-lg">
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-200 text-sm tracking-widest">
            <th className="py-2">Category</th>
            <th className="py-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {sortedCategoryTimes.map(([category, timeData]) => (
            <tr key={category} className="font-lexend text-sm  tracking-wider">
              <td className="py-3 text-white">{category}</td>
              <td className="py-3 text-white text-right">
                {timeData.formattedTime}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTotals;
