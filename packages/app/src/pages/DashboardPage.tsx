/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from "react";
import { type DataClient } from "@repo/types";
import { useLoading } from "../contexts/LoadingContext.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { Container } from "../components/Container.js";
import { MonthlyActivityChart } from "../components/charts/MonthlyChart.js";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl min-w-full mx-auto">
        <MonthlyActivityChart data={overviewData} />
      </div>
    </Container>
  );
};
