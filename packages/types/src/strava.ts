export interface StravaBike {
	id: string;
	primary: boolean;
	name: string;
	nickname: string;
	resource_state: number;
	retired: boolean;
	distance: number;
	converted_distance: number;
}

export interface StravaShoe {
	id: string;
	primary: boolean;
	name: string;
	nickname: string;
	resource_state: number;
	retired: boolean;
	distance: number;
	converted_distance: number;
}

export interface StravaAthlete {
	id: number;
	username: string;
	resource_state: number;
	firstname: string;
	lastname: string;
	bio: string;
	city: string;
	state: string;
	country: string;
	sex: string;
	premium: boolean;
	summit: boolean;
	created_at: string;
	updated_at: string;
	badge_type_id: number;
	weight: number;
	profile_medium: string;
	profile: string;
	friend: number | null;
	follower: number | null;
	blocked: boolean;
	can_follow: boolean;
	follower_count: number;
	friend_count: number;
	mutual_friend_count: number;
	athlete_type: number;
	date_preference: string;
	measurement_preference: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	clubs: any[];
	postable_clubs_count: number;
	ftp: number | null;
	bikes: StravaBike[];
	shoes: StravaShoe[];
}

export interface StravaMap {
	id: string;
	summary_polyline: string;
	resource_state: number;
}

export interface StravaActivity {
	resource_state: number;
	athlete: {
		id: number;
		resource_state: number;
	};
	name: string;
	distance: number;
	moving_time: number;
	elapsed_time: number;
	total_elevation_gain: number;
	type: "Run" | "Workout" | string;
	sport_type: "Run" | "Workout" | string;
	workout_type: number | null;
	id: number;
	start_date: string;
	start_date_local: string;
	timezone: string;
	utc_offset: number;
	location_city: string | null;
	location_state: string | null;
	location_country: string | null;
	achievement_count: number;
	kudos_count: number;
	comment_count: number;
	athlete_count: number;
	photo_count: number;
	map: StravaMap;
	trainer: boolean;
	commute: boolean;
	manual: boolean;
	private: boolean;
	visibility: string;
	flagged: boolean;
	gear_id: string | null;
	start_latlng: [number, number] | [];
	end_latlng: [number, number] | [];
	average_speed: number;
	max_speed: number;
	average_cadence?: number;
	average_watts?: number;
	max_watts?: number;
	weighted_average_watts?: number;
	device_watts?: boolean;
	kilojoules?: number;
	has_heartrate: boolean;
	average_heartrate: number;
	max_heartrate: number;
	heartrate_opt_out: boolean;
	display_hide_heartrate_option: boolean;
	elev_high: number;
	elev_low: number;
	upload_id: number;
	upload_id_str: string;
	external_id: string;
	from_accepted_tag: boolean;
	pr_count: number;
	total_photo_count: number;
	has_kudoed: boolean;
	device_name?: string;
	embed_token?: string;
}
