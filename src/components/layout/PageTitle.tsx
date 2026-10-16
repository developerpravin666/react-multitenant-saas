import { useLayoutEffect, type ReactElement } from "react";

function PageTitle({ title, children }: { title: string; children: ReactElement }) {
  useLayoutEffect(() => {
    document.title = `${title} | Siddhi`;
  }, [title]);

  return children;
}

/** Keep page titles beside the route that renders each screen. */
export function withPageTitle(title: string, page: ReactElement) {
  return <PageTitle title={title}>{page}</PageTitle>;
}
