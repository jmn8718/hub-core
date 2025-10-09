"use client";

import { Providers } from "@repo/types";

export default function Activities() {
	const syncProvider = (provider: Providers) => {
		fetch(`/api/activities/${provider}/sync`)
			.then((response) => {
				if (response.status === 200) {
					return response.json();
				}
				throw new Error("error");
			})
			.then((data) => {
				console.log(data);
			})
			.catch(console.error);
	};

	return (
		<div className="flex flex-col">
			<button type="button" onClick={() => syncProvider(Providers.COROS)}>
				{Providers.COROS}
			</button>
			<button type="button" onClick={() => syncProvider(Providers.GARMIN)}>
				{Providers.GARMIN}
			</button>
			<button type="button" onClick={() => syncProvider(Providers.STRAVA)}>
				{Providers.STRAVA}
			</button>
		</div>
	);
}
