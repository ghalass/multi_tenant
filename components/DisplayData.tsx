import React from "react";

const DisplayData = (data: any) => {
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

export default DisplayData;
