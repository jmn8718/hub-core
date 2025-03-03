/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from "react";
import { type DataClient } from "@repo/types";
import { useLoading } from "../contexts/LoadingContext.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { Container } from "../components/Container.js";
import { MonthlyActivityChart } from "../components/MonthlyChart.js";
import { WeeklyActivityChart } from "../components/charts/WeeklyActivity.js";

export const DashboardPage = () => {
  const { setLocalLoading } = useLoading();
  const { client } = useDataClient();

  const [overviewData, setOverviewData] = useState<
    Awaited<ReturnType<DataClient["getDataOverview"]>>
  >([]);

  const fetchData = useCallback(async () => {
    setLocalLoading(true);
    const result = await client.getDataOverview({ limit: 12 });
    setOverviewData(result.reverse());
    setTimeout(() => {
      setLocalLoading(false);
    }, 500);
  }, [setOverviewData, setLocalLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Container>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-2xl min-w-full mx-auto">
        <MonthlyActivityChart data={overviewData} />
        <WeeklyActivityChart
          data={[
            { week: "1", distance: 100 },
            { week: "2", distance: 300 },
            { week: "4", distance: 200 },
          ]}
        />
      </div>
    </Container>
  );
};
