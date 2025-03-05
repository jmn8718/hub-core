import { PropsWithChildren } from "react";

function Container({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen max-w-2xl min-w-[480px] grid gid-col-3 place-items-center mx-auto">
      <div className="w-[768px]">{children}</div>
    </div>
  );
}
Container.displayName = "Container";

export { Container };
