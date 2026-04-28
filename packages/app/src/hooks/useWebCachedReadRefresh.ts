import { AppType } from "@repo/types";
import { useEffect } from "react";
import { useDataClient } from "../contexts/DataClientContext.js";

const CACHED_READ_REFRESH_EVENT = "hub-core:cached-read-refresh";

type CachedReadRefreshDetail = {
	action?: string;
};

export const useWebCachedReadRefresh = (
	actions: readonly string[],
	onRefresh: () => void | Promise<void>,
) => {
	const { type } = useDataClient();

	useEffect(() => {
		if (type !== AppType.WEB || typeof window === "undefined") {
			return;
		}

		const allowedActions = new Set(actions);
		const handleRefresh = (event: Event) => {
			if (!(event instanceof CustomEvent)) {
				return;
			}

			const { action } =
				(event as CustomEvent<CachedReadRefreshDetail>).detail ?? {};
			if (!action || !allowedActions.has(action)) {
				return;
			}

			void onRefresh();
		};

		window.addEventListener(CACHED_READ_REFRESH_EVENT, handleRefresh);
		return () => {
			window.removeEventListener(CACHED_READ_REFRESH_EVENT, handleRefresh);
		};
	}, [actions, onRefresh, type]);
};
