import React, { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TasklistSyncSettings = () => {
  const { data: categories } = useCategories();
  const [tasklists, setTasklists] = useState([]);

  const fetchAndMergeTasklists = async () => {
    try {
      // active
      const dbRes = await fetch(import.meta.env.VITE_CLOUDFRONT_SYNC_GTASKS, {
        method: "GET",
        credentials: "include",
      });
      const dbData = await dbRes.json();
      const dbTasklists = dbData.tasklist || [];

      // available
      const oauthRes = await fetch(
        import.meta.env.VITE_CLOUDFRONT_GTASKS_LIST,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const oauthData = await oauthRes.json();
      const oauthTasklists = oauthData.task_lists || [];

      const merged = oauthTasklists.map((oauthTasklist) => {
        const match = dbTasklists.find(
          (dbTasklist) =>
            dbTasklist.tasklist_uid.split(":", 2)[1] === oauthTasklist.id
        );

        if (match) {
          return {
            ...oauthTasklist,
            ...match,
            sync: match.sync,
          };
        } else {
          return {
            ...oauthTasklist,
            tasklist_name: oauthTasklist.title,
            sync: false,
            default_category: "",
            default_category_uid: "",
          };
        }
      });
      setTasklists(merged);
    } catch (error) {
      console.error("Error fetching calendars:", error);
    }
  };

  const updateTasklist = async (payload) => {
    const updateResponse = await fetch(
      import.meta.env.VITE_CLOUDFRONT_GTASKS_LIST,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    if (updateResponse.ok) {
      console.log("Tasklist - Updates");
    }
  };

  const updateTasklistCategory = (newTasklist, newValue) => {
    setTasklists((prev) =>
      prev.map((tasklist) =>
        tasklist.id === newTasklist.id
          ? {
              ...tasklist,
              default_category: newValue == "" ? "" : newValue.split(":", 2)[1],
              default_category_uid: newValue,
            }
          : tasklist
      )
    );

    const payload = {
      tasklistID: newTasklist.id,
      sync: newTasklist.sync,
      title: newTasklist.tasklist_name,
      defaultCategory: newValue.split(":", 2)[1],
    };
    updateTasklist(payload);
  };

  const updateTasklistSync = (newTasklist, newValue) => {
    setTasklists((prev) =>
      prev.map((tasklist) =>
        tasklist.id === newTasklist.id
          ? { ...tasklist, sync: newValue }
          : tasklist
      )
    );

    const payload = {
      tasklistID: newTasklist.id,
      sync: newValue,
      title: newTasklist.tasklist_name,
      defaultCategory: newTasklist.default_category,
    };
    updateTasklist(payload);
  };

  useEffect(() => {
    fetchAndMergeTasklists();
  }, []);

  return (
    <div>
      <div className="space-y-4 p-4">
        <div>Synced Tasklists</div>
        {tasklists.map((tasklist) => (
          <div
            key={tasklist.id}
            className="flex items-center gap-4 sm:gap-20 rounded-md bg-gray-800 px-4 py-2 text-sm"
          >
            {/* Tasklist name */}
            <div className="text-white w-[200px] sm:w-[325px] break-words line-clamp-5">
              {tasklist.tasklist_name}
            </div>

            {/* Category dropdown */}
            <Select
              value={tasklist.default_category_uid || ""}
              onValueChange={(val) =>
                updateTasklistCategory(tasklist, val === "__none__" ? "" : val)
              }
            >
              <SelectTrigger className="w-[190px] sm:w-[220px] bg-slate-800 text-white border border-slate-600">
                <SelectValue placeholder="Category" />
              </SelectTrigger>

              <SelectContent className="bg-slate-900 text-white border border-slate-700">
                <SelectItem value="__none__">No Default</SelectItem>
                {categories.map((category) => (
                  <SelectItem
                    key={category.category_uid}
                    value={category.category_uid}
                  >
                    {category.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sync switch */}
            <div className="ml-auto">
              <Switch
                checked={tasklist.sync}
                onCheckedChange={(val) => updateTasklistSync(tasklist, val)}
                className="border border-slate-500  data-[state=unchecked]:bg-slate-600 data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TasklistSyncSettings;
