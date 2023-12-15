import "./App.css";

import { CSVLink } from "react-csv";

const ExportButton = () => {
  // Example data (replace this with your actual data)
  const xyzData = [
    ["Name", "Age", "City"],
    ["John Doe", 25, "New York"],
    ["Jane Doe", 30, "San Francisco"],
  ];

  // CSVLink data
  const csvData = [...xyzData];

  return (
    <div>
      <CSVLink data={csvData} filename={"xyz_data.csv"}>
        <button>Export CSV</button>
      </CSVLink>
    </div>
  );
};

function App() {
  return (
    <>
      <div>Hello</div>
      <ExportButton />
    </>
  );
}

export default App;
