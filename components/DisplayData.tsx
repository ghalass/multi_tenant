import type { JSX } from "react";

const DisplayData = (data: unknown): JSX.Element => {
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

export default DisplayData;