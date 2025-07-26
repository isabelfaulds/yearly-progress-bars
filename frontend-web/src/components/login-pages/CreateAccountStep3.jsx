import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import SyncTable from "./SyncTable";
import { useCategories } from "@/hooks/useCategories";

const CreateAccountStep3 = ({ onPrev }) => {
  const { data: categories } = useCategories();
  const navigate = useNavigate();

  // Get list of calendars
  const [tasklists, setTasklists] = useState([]);
  const getTasklists = async () => {
    const response = await fetch(import.meta.env.VITE_CLOUDFRONT_GTASKS_LIST, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch tasklists");
    const data = await response.json();
    setTasklists(data.task_lists);
  };

  useEffect(() => {
    getTasklists();
  }, []);

  // Get selections
  const tableRef = useRef();

  const handleFinish = async () => {
    const latestData = tableRef.current.getCurrentState();
    const mappedData = latestData
      .filter((item) => item.selected)
      .map(({ defaultCategory, id, ...rest }) => ({
        ...rest,
        defaultCategory: defaultCategory?.toLowerCase() ?? null,
        sync: true,
        tasklistID: id,
      }));

    const finish = await Promise.all(
      mappedData.map((item) =>
        fetch(import.meta.env.VITE_CLOUDFRONT_GTASKS_LIST, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(item),
        })
      )
    );
    console.log("Updated - Tasklist settings");
    navigate("/day-view");
  };

  return (
    <div className="initial-container">
      <div className="mb-10 font-lexend">
        <div className="text-xl mb-10">Set Tasklist Preferences</div>
      </div>
      <div className="m-3">Choose Tasklists to Sync</div>
      <div className="m-2 mb-4">
        Select tasklists and set any preferred defaults, make changes later in
        Settings{" "}
      </div>
      <SyncTable
        data={tasklists}
        categories={categories}
        ref={tableRef}
        nameKey={"title"}
        nameHeader={"Tasklist Name"}
      />
      <div className="mt-4 m-3 flex flex-row gap-1 mx-auto">
        <div className="flex flex-row mx-auto gap-5">
          <Button onClick={onPrev} className="">
            Prev
          </Button>
          <Button onClick={handleFinish} className="">
            Finish
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountStep3;
