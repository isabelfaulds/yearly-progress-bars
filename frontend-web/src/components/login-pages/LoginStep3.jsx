import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import CalendarTable from "./CalendarTable";
import { useCategories } from "@/hooks/useCategories";

const LoginStep3 = () => {
  const { data: categories, isLoading, error } = useCategories();
  const navigate = useNavigate();

  // Get list of calendars
  const [calendars, setCalendars] = useState([]);
  const getCalendars = async () => {
    const response = await fetch(import.meta.env.VITE_CLOUDFRONT_GCAL_LIST, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch categories");
    const data = await response.json();
    setCalendars(data.calendars);
    console.log(data);
  };

  useEffect(() => {
    getCalendars();
  }, []);

  // Get selections
  const tableRef = useRef();

  const handleFinish = async () => {
    const latestData = tableRef.current.getCurrentState();
    console.log("Final table state", latestData);

    const mappedData = latestData
      .filter((item) => item.selected)
      .map(({ defaultCategory, ...rest }) => ({
        ...rest,
        defaultCategory: defaultCategory?.toLowerCase() ?? null,
        sync: true,
      }));
    console.log("mappedData", mappedData);

    const finish = await Promise.all(
      latestData
        .filter((item) => item.selected)
        .map(({ defaultCategory, ...rest }) => ({
          ...rest,
          defaultCategory: defaultCategory?.toLowerCase() ?? null,
          sync: true,
        }))
        .map((item) =>
          fetch(import.meta.env.VITE_CLOUDFRONT_GCAL_LIST, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(item),
          })
        )
    );
    console.log("Updated - Calendar settings");
    navigate("/day-view");
  };

  return (
    <div className="initial-container">
      <div className="mb-10 font-lexend">
        <div className="text-xl mb-10">Set Calendar Preferences</div>
      </div>
      <div className="m-3">Choose Calendars to Sync</div>
      <div className="m-2 mb-4">
        Select calendars and set any preferred defaults, make changes later in
        Settings{" "}
      </div>
      <CalendarTable data={calendars} categories={categories} ref={tableRef} />
      <div className="mt-4 m-3 flex flex-col gap-3 mx-auto">
        <Button onClick={handleFinish} className="mx-auto p-2 max-w-1/3">
          Finish
        </Button>
      </div>
    </div>
  );
};

export default LoginStep3;
