export abstract class Client {
	abstract connect(params: {
		username: string;
		password: string;
		force: true;
	}): Promise<void>;

	abstract sync(): Promise<void>;

	abstract getActivity(id: string): Promise<unknown>;
}
